import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from './apiClient';

const STORAGE_KEY = 'bj_wishlist';

const WishlistContext = createContext(null);

/** Product ids are numbers; tolerate ids that arrive as strings (e.g. from the URL). */
function normId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map(normId).filter((id) => id !== null)));
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    save(items);
  }, [items]);

  const toggle = useCallback((id) => {
    const n = normId(id);
    if (n === null) return;
    setItems((prev) => (prev.includes(n) ? prev.filter((i) => i !== n) : [...prev, n]));
  }, []);

  /** Remove one id — e.g. when the product was deleted or unpublished (404). */
  const remove = useCallback((id) => {
    const n = normId(id);
    setItems((prev) => (prev.includes(n) ? prev.filter((i) => i !== n) : prev));
  }, []);

  const has = useCallback((id) => items.includes(normId(id)), [items]);

  const value = useMemo(
    () => ({ items, toggle, remove, has, count: items.length }),
    [items, toggle, remove, has],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

/**
 * Loads the wishlisted products (GET /products/{id} each) while `active` is true.
 * Products that no longer exist or were unpublished (404) are removed from the wishlist.
 * Each time the list becomes active again (or on retry) everything is refreshed.
 *
 * Returns { products, loading, failedCount, retry } — products are in wishlist order.
 */
export function useWishlistProducts(active = true) {
  const { items: ids, remove } = useWishlist();
  const [byId, setById] = useState({});
  const [loading, setLoading] = useState(false);
  const [failedIds, setFailedIds] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const fetched = useRef(new Set());
  const idsKey = ids.join(',');

  useEffect(() => {
    if (active) fetched.current = new Set();
  }, [active, reloadKey]);

  useEffect(() => {
    if (!active) return undefined;
    const toFetch = ids.filter((id) => !fetched.current.has(id));
    if (toFetch.length === 0) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      toFetch.map((id) =>
        api.get(`/products/${id}`).then(
          (res) => ({ id, product: res.data }),
          (err) => ({ id, status: err?.response?.status ?? 0 }),
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      const found = {};
      const gone = [];
      const failed = [];
      results.forEach((r) => {
        if (r.product) {
          found[r.id] = r.product;
          fetched.current.add(r.id);
        } else if (r.status === 404) {
          gone.push(r.id);
          fetched.current.add(r.id);
        } else {
          failed.push(r.id);
        }
      });
      setById((prev) => ({ ...prev, ...found }));
      setFailedIds(failed);
      setLoading(false);
      gone.forEach(remove); // deleted or unpublished — stop counting it
    });
    return () => {
      cancelled = true;
    };
    // `idsKey` stands in for `ids` so a new-but-equal array doesn't refetch
  }, [active, idsKey, reloadKey, remove]);

  const products = useMemo(
    () => ids.map((id) => byId[id]).filter(Boolean),
    [ids, byId],
  );
  const failedCount = failedIds.filter((id) => ids.includes(id)).length;
  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { products, loading, failedCount, retry };
}
