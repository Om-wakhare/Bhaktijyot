import { useEffect, useId, useRef, useState } from 'react';
import { X, Minus, Plus, Trash2, Package, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';
import {
  useCart,
  formatINR,
  isPurchasable,
  maxQuantityFor,
  primaryImagePath,
  validPrice,
} from '../../services/cart';
import { mediaUrl } from '../../services/media';
import { useDialog } from '../../hooks/useDialog';

import catIdols     from '../../assets/cat-idols.webp';
import catDiya      from '../../assets/cat-diya.webp';
import catRudraksha from '../../assets/cat-rudraksha.webp';
import catPooja     from '../../assets/cat-pooja.webp';

/* Each tile's label describes what its photo actually shows. */
const CATEGORIES = [
  { label: 'Pooja Essentials', to: '/products?world=pooja', img: catPooja     },
  { label: 'Rudraksha',        to: '/products?q=rudraksha', img: catRudraksha },
  { label: 'Diyas & Lamps',    to: '/products?q=diya',      img: catDiya      },
  { label: 'Idols & Murtis',   to: '/products?q=idol',      img: catIdols     },
];

function TopPickRow({ product, onClose, onAdd }) {
  const image = primaryImagePath(product);
  const price = validPrice(product.price);
  const href = `/products/${product.id}`;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 border border-espresso/8">
      <Link to={href} onClick={onClose} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <div className="h-12 w-12 rounded-lg overflow-hidden" style={{ backgroundColor: '#E8CAA8' }}>
          {image ? (
            <img src={mediaUrl(image)} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package className="h-5 w-5 text-espresso/30" aria-hidden="true" />
            </div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={href}
          onClick={onClose}
          className="block text-xs font-semibold text-espresso line-clamp-2 leading-snug hover:text-primary"
        >
          {product.name}
        </Link>
        <p className="text-xs font-bold mt-0.5 text-primary">
          {price !== null ? formatINR(price) : 'Price on request'}
        </p>
      </div>
      {isPurchasable(product) ? (
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label={`Add ${product.name} to cart`}
          className="shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          Add
        </button>
      ) : (
        <Link
          to={href}
          onClick={onClose}
          aria-label={`View ${product.name}`}
          className="shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-primary border border-primary/40 hover:bg-primary/8 transition-colors"
        >
          View
        </Link>
      )}
    </li>
  );
}

export function CartDrawer({ open, onClose }) {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    totalAmount,
    totalItems,
    hasPriceOnRequest,
  } = useCart();
  const dialogRef = useDialog(open, onClose);
  const titleId = useId();
  const hasItems = items.length > 0;

  /* Real top-rated products, fetched only once the drawer is opened with an empty cart. */
  const [picks, setPicks] = useState(null); // null = not loaded yet
  const picksRequested = useRef(false);

  useEffect(() => {
    if (!open || hasItems || picksRequested.current) return;
    picksRequested.current = true;
    api
      .get('/products/catalog', { params: { sort: 'rating', limit: 4 } })
      .then((res) => setPicks(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => {
        picksRequested.current = false; // try again next time the drawer opens
        setPicks([]);
      });
  }, [open, hasItems]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[400px] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out focus:outline-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#F4E4D1' }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/60 border-b border-espresso/10">
          <div className="flex items-center gap-3">
            <h2 id={titleId} className="text-sm font-black tracking-[0.18em] uppercase text-espresso">
              Your Cart
              <span className="sr-only">
                {` (${totalItems} item${totalItems === 1 ? '' : 's'})`}
              </span>
            </h2>
            <span
              aria-hidden="true"
              className="h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: '#1C1209', minWidth: '1.25rem' }}
            >
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-espresso/10 transition-colors text-espresso"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* ── Free shipping note (no threshold — every order ships free) ── */}
        {hasItems && (
          <div className="px-5 py-2 bg-white/40 border-b border-espresso/8 flex items-center justify-center gap-1.5 text-[11px] font-bold text-primary">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            Free shipping on all orders
          </div>
        )}

        {/* ── Scrollable body ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── EMPTY STATE ──────────────────────────────────── */}
          {!hasItems && (
            <div className="px-5 pt-6 pb-4">
              <div className="flex flex-col items-center py-5 text-center">
                <div className="h-20 w-20 flex items-center justify-center rounded-full mb-4"
                     style={{ background: '#E8CAA8' }}>
                  <Package className="h-10 w-10" style={{ color: '#C9A84C' }} aria-hidden="true" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-espresso">
                  Your cart is feeling empty.
                </p>
                <p className="mt-1 text-xs text-espresso/50 font-medium">
                  We can help out with that!
                </p>
              </div>

              {/* 2×2 Category tiles */}
              <ul className="grid grid-cols-2 gap-2.5 mt-3">
                {CATEGORIES.map((cat) => (
                  <li key={cat.label}>
                    <Link
                      to={cat.to}
                      onClick={onClose}
                      className="relative block overflow-hidden rounded-xl group"
                      style={{ paddingBottom: '70%' }}
                    >
                      <img
                        src={cat.img}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0"
                           style={{ background: 'linear-gradient(to top, rgba(28,18,9,0.75) 0%, transparent 55%)' }} />
                      <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                        {cat.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Top-rated products (real catalogue data) */}
              {(picks === null || picks.length > 0) && (
                <div className="mt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-espresso mb-3">
                    Top rated picks
                  </p>
                  {picks === null ? (
                    <div className="space-y-2" aria-hidden="true">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-[68px] rounded-xl shimmer-bg" />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {picks.map((p) => (
                        <TopPickRow key={p.id} product={p} onClose={onClose} onAdd={addItem} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ITEMS ────────────────────────────────────────── */}
          {hasItems && (
            <ul className="px-5 pt-4 pb-2 space-y-3">
              {items.map((item) => {
                const href = `/products/${item.product_id}`;
                const priced = item.price !== null;
                const showMrp = priced && item.mrp !== null && item.mrp > item.price;
                const max = maxQuantityFor(item.stock);
                return (
                  <li
                    key={item.product_id}
                    className="flex gap-3 p-3 rounded-2xl bg-white/70 border border-espresso/8"
                  >
                    {/* Image */}
                    <Link to={href} onClick={onClose} className="shrink-0" tabIndex={-1} aria-hidden="true">
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{ width: 72, height: 72, backgroundColor: '#E8CAA8' }}
                      >
                        {item.image_path ? (
                          <img
                            src={mediaUrl(item.image_path)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-espresso/30" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          to={href}
                          onClick={onClose}
                          className="text-xs font-semibold text-espresso line-clamp-2 leading-snug flex-1 hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full hover:bg-red-50 text-espresso/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      {priced ? (
                        <>
                          <p className="text-sm font-black mt-1 text-primary">
                            {formatINR(item.price * item.quantity)}
                          </p>
                          {(item.quantity > 1 || showMrp) && (
                            <p className="text-[10px] text-espresso/50">
                              {item.quantity > 1 && <span>{formatINR(item.price)} each</span>}
                              {item.quantity > 1 && showMrp && <span aria-hidden="true"> · </span>}
                              {showMrp && (
                                <span className="line-through">
                                  <span className="sr-only">MRP </span>{formatINR(item.mrp)}
                                </span>
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs font-bold mt-1 text-amber-dark">
                          Price on request
                        </p>
                      )}

                      {/* Qty controls */}
                      <div className="flex items-center gap-1 mt-2 w-fit border border-espresso/15 rounded-lg overflow-hidden bg-white/80">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="h-7 w-7 flex items-center justify-center text-espresso hover:bg-espresso/8 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-espresso" aria-live="polite">
                          <span className="sr-only">Quantity </span>{item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= max}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-7 w-7 flex items-center justify-center text-espresso hover:bg-espresso/8 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                      {item.stock > 0 && item.quantity >= max && max < 99 && (
                        <p className="mt-1 text-[10px] text-espresso/50">Only {item.stock} available</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        {hasItems && (
          <div
            className="border-t border-espresso/10 bg-white/60 px-5 py-4 space-y-3"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {/* Subtotal row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-espresso">Subtotal</span>
              <span className="text-lg font-black text-espresso">
                {formatINR(totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-espresso/60 -mt-1.5">
              <span>Shipping</span>
              <span className="font-bold text-primary">Free</span>
            </div>

            {hasPriceOnRequest && (
              <p className="text-[11px] leading-snug rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
                Some items are price on request and can&apos;t be paid online. Review your cart to remove
                them or enquire on WhatsApp.
              </p>
            )}

            {/* Continue shopping */}
            <Link
              to="/products"
              onClick={onClose}
              className="block w-full text-center py-3 rounded-xl border-2 border-espresso text-xs font-black uppercase tracking-[0.14em] text-espresso hover:bg-espresso/6 transition-colors"
            >
              Continue Shopping
            </Link>

            {/* Checkout */}
            <Link
              to={hasPriceOnRequest ? '/cart' : '/checkout'}
              onClick={onClose}
              className="block w-full text-center py-3 rounded-xl text-xs font-black uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1C1209' }}
            >
              {hasPriceOnRequest ? 'Review Cart' : (
                <><span aria-hidden="true">🔒 </span>Proceed to Checkout</>
              )}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
