import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from './apiClient';

const STORAGE_KEY = 'bj_cart';

/** The server accepts 1–99 units per order line. */
export const MAX_QTY = 99;

const CartContext = createContext(null);

/* ── Helpers (also used by product cards, cart and checkout pages) ── */

/** A positive, finite price — or null ("price on request"). */
export function validPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Stock as an integer, matching the backend: -1 = unlimited / not tracked (also used when
 * unknown), 0 = out of stock, 1+ = units in stock. Only 0 blocks buying.
 */
export function normalizeStock(value) {
  if (value === null || value === undefined || value === '') return -1;
  const n = Number(value);
  if (!Number.isFinite(n)) return -1;
  const s = Math.trunc(n);
  return s < 0 ? -1 : s;
}

/** Highest quantity allowed for one line: 99, or the stock when it is tracked (stock > 0). */
export function maxQuantityFor(stock) {
  const s = normalizeStock(stock);
  return s > 0 ? Math.min(MAX_QTY, s) : MAX_QTY;
}

/** Why a cart line can't be paid for online right now, or null when it can. */
export function lineIssue(line) {
  if (!line) return null;
  if (line.unavailable) return 'unavailable';
  if (line.price === null) return 'price_on_request';
  if (normalizeStock(line.stock) === 0) return 'out_of_stock';
  if (normalizeStock(line.stock) > 0 && line.quantity > line.stock) return 'not_enough_stock';
  return null;
}

/** Primary image of a product: images[0] is always the primary one. */
export function primaryImagePath(product) {
  return product?.images?.[0]?.image_path || product?.image_path || null;
}

/** True when the product can be bought online right now. */
export function isPurchasable(product) {
  return !!product && validPrice(product.price) !== null && normalizeStock(product.stock) !== 0;
}

/** "₹1,299" / "₹1,299.5" — INR with Indian digit grouping. */
export function formatINR(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function clampQty(qty, stock) {
  const max = Math.max(1, maxQuantityFor(stock));
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n)) return 1;
  return Math.min(max, Math.max(1, n));
}

/* Old carts stored a null price as 0; keep such lines (as price: null) so the cart can
   explain that they're "price on request" instead of silently dropping them. */
function sanitizeLine(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.product_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const stock = normalizeStock(raw.stock);
  return {
    product_id: id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Product',
    price: validPrice(raw.price),
    mrp: validPrice(raw.mrp),
    image_path: typeof raw.image_path === 'string' && raw.image_path ? raw.image_path : null,
    stock,
    quantity: clampQty(raw.quantity, stock),
  };
}

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const byId = new Map();
    parsed.forEach((entry) => {
      const line = sanitizeLine(entry);
      if (!line) return;
      const prev = byId.get(line.product_id);
      byId.set(
        line.product_id,
        prev ? { ...line, quantity: clampQty(prev.quantity + line.quantity, line.stock) } : line,
      );
    });
    return Array.from(byId.values());
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full / blocked (private mode) — the cart still works for this visit */
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  // Source of truth for synchronous reads, so addItem can report success immediately.
  const itemsRef = useRef(items);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const commit = useCallback((updater) => {
    const next = updater(itemsRef.current);
    if (next === itemsRef.current) return;
    itemsRef.current = next;
    setItems(next);
  }, []);

  /**
   * Add a product (or more of it). Returns true when something was added; false when the
   * product has no price ("price on request"), is out of stock, or the line is already
   * at its maximum quantity.
   */
  const addItem = useCallback((product, qty = 1) => {
    if (!product || product.id === null || product.id === undefined) return false;
    const price = validPrice(product.price);
    const stock = normalizeStock(product.stock);
    if (price === null || stock === 0) return false;

    const id = Number(product.id);
    const max = maxQuantityFor(stock);
    const adding = Math.max(1, Math.floor(Number(qty)) || 1);
    const existing = itemsRef.current.find((i) => i.product_id === id);
    if (existing && existing.quantity >= max) return false;

    const line = {
      product_id: id,
      name: product.name || existing?.name || 'Product',
      price,
      mrp: validPrice(product.mrp),
      image_path: primaryImagePath(product) || existing?.image_path || null,
      stock,
      quantity: Math.min(max, (existing ? existing.quantity : 0) + adding),
    };
    commit((prev) =>
      existing ? prev.map((i) => (i.product_id === id ? line : i)) : [...prev, line],
    );
    return true;
  }, [commit]);

  const removeItem = useCallback((productId) => {
    const id = Number(productId);
    commit((prev) =>
      prev.some((i) => i.product_id === id) ? prev.filter((i) => i.product_id !== id) : prev,
    );
  }, [commit]);

  /** Set a line's quantity, clamped to 1–99 and to the known stock. */
  const updateQuantity = useCallback((productId, quantity) => {
    const id = Number(productId);
    if (!(Number(quantity) >= 1)) return;
    commit((prev) => {
      let changed = false;
      const next = prev.map((i) => {
        if (i.product_id !== id) return i;
        const q = clampQty(quantity, i.stock);
        if (q === i.quantity) return i;
        changed = true;
        return { ...i, quantity: q };
      });
      return changed ? next : prev;
    });
  }, [commit]);

  const clearCart = useCallback(() => {
    commit((prev) => (prev.length ? [] : prev));
  }, [commit]);

  /**
   * Re-read every line from the server (GET /products/{id}) so the cart shows the current
   * name, price, image and stock instead of what was saved when the item was added.
   * Lines whose product was deleted or unpublished (404) are flagged `unavailable`;
   * quantities above the tracked stock are reduced to it.
   * Resolves to { changed: string[] } — names of lines whose price or quantity changed.
   */
  const refresh = useCallback(async () => {
    const ids = itemsRef.current.map((i) => i.product_id);
    if (ids.length === 0) return { changed: [] };
    const results = await Promise.all(
      ids.map((id) =>
        api.get(`/products/${id}`).then(
          (res) => ({ id, product: res.data }),
          (err) => ({ id, status: err?.response?.status ?? 0 }),
        ),
      ),
    );
    const byId = new Map(results.map((r) => [r.id, r]));
    const changed = [];
    commit((prev) => {
      let any = false;
      const next = prev.map((line) => {
        const r = byId.get(line.product_id);
        if (!r) return line;
        if (r.status === 404) {
          if (line.unavailable) return line;
          any = true;
          return { ...line, unavailable: true };
        }
        if (!r.product) return line; // network error: keep what we have
        const p = r.product;
        const stock = normalizeStock(p.stock);
        const price = validPrice(p.price);
        const quantity = stock > 0 ? Math.min(line.quantity, maxQuantityFor(stock)) : line.quantity;
        const updated = {
          ...line,
          name: p.name || line.name,
          price,
          mrp: validPrice(p.mrp),
          image_path: primaryImagePath(p) || line.image_path,
          stock,
          quantity,
          unavailable: false,
        };
        if (price !== line.price || quantity !== line.quantity) changed.push(updated.name);
        const same = ['name', 'price', 'mrp', 'image_path', 'stock', 'quantity', 'unavailable']
          .every((k) => updated[k] === line[k]);
        if (same) return line;
        any = true;
        return updated;
      });
      return any ? next : prev;
    });
    return { changed };
  }, [commit]);

  const value = useMemo(() => {
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount =
      Math.round(items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0) * 100) / 100;
    const hasPriceOnRequest = items.some((i) => i.price === null);
    // Lines that stop the cart being paid online (price on request, out of stock, removed)
    const blockedCount = items.filter((i) => lineIssue(i) !== null).length;
    return {
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      refresh,
      totalItems,
      totalAmount,
      hasPriceOnRequest,
      blockedCount,
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
