import { useEffect, useId, useRef, useState } from 'react';
import { X, Heart, Gem, ShoppingBag, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist, useWishlistProducts } from '../../services/wishlist';
import { useCart, formatINR, normalizeStock, primaryImagePath, validPrice } from '../../services/cart';
import { mediaUrl } from '../../services/media';
import { useDialog } from '../../hooks/useDialog';

export function WishlistDrawer({ open, onClose }) {
  const { toggle, count } = useWishlist();
  const { addItem } = useCart();
  const { products, loading, failedCount, retry } = useWishlistProducts(open);
  const dialogRef = useDialog(open, onClose);
  const titleId = useId();

  // Brief "Added" / "Max in cart" feedback per product
  const [feedback, setFeedback] = useState({});
  const timers = useRef({});
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const handleAdd = (p) => {
    const ok = addItem(p);
    setFeedback((f) => ({ ...f, [p.id]: ok ? 'added' : 'max' }));
    clearTimeout(timers.current[p.id]);
    timers.current[p.id] = setTimeout(() => {
      setFeedback((f) => {
        const next = { ...f };
        delete next[p.id];
        return next;
      });
    }, 1800);
  };

  const showSkeleton = loading && products.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-96 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out focus:outline-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#F4E4D1' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-espresso/10">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" fill="currentColor" aria-hidden="true" />
            <h2 id={titleId} className="text-base font-semibold text-espresso">Wishlist ({count})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wishlist"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-espresso/10 transition-colors text-espresso/50 hover:text-espresso"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <Heart className="h-14 w-14 text-espresso/10" aria-hidden="true" />
              <p className="text-espresso/50 text-sm font-medium">Your wishlist is empty</p>
              <Link
                to="/products"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : showSkeleton ? (
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-2xl border border-espresso/10 bg-white/40 animate-pulse">
                  <div className="h-16 w-16 rounded-xl shrink-0" style={{ backgroundColor: '#E8CAA8' }} />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: '#E8CAA8' }} />
                    <div className="h-3 rounded-full w-1/3" style={{ backgroundColor: '#E8CAA8' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {failedCount > 0 && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span>
                    Couldn&apos;t load {failedCount} saved item{failedCount > 1 ? 's' : ''}.
                  </span>
                  <button type="button" onClick={retry} className="font-semibold underline underline-offset-2">
                    Retry
                  </button>
                </div>
              )}
              <ul className="space-y-3">
                {products.map((p) => {
                  const href = `/products/${p.id}`;
                  const image = primaryImagePath(p);
                  const price = validPrice(p.price);
                  const oos = normalizeStock(p.stock) === 0;
                  const fb = feedback[p.id];
                  return (
                    <li
                      key={p.id}
                      className="flex gap-3 p-3 rounded-2xl border border-espresso/10"
                      style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                    >
                      {/* Image */}
                      <Link to={href} onClick={onClose} className="shrink-0" tabIndex={-1} aria-hidden="true">
                        <div className="h-16 w-16 rounded-xl overflow-hidden" style={{ backgroundColor: '#E8CAA8' }}>
                          {image ? (
                            <img src={mediaUrl(image)} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Gem className="h-6 w-6 text-espresso/30" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={href}
                          onClick={onClose}
                          className="block text-sm font-medium text-espresso line-clamp-2 leading-snug hover:text-primary transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-sm font-bold text-primary mt-0.5">
                          {price !== null ? formatINR(price) : 'Price on request'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {price === null ? (
                            <Link
                              to={href}
                              onClick={onClose}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-[11px] font-semibold hover:bg-primary/8 transition-colors"
                            >
                              View details
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAdd(p)}
                              disabled={oos}
                              aria-label={oos ? `${p.name} is out of stock` : `Add ${p.name} to cart`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {fb === 'added'
                                ? <Check className="h-3 w-3" aria-hidden="true" />
                                : <ShoppingBag className="h-3 w-3" aria-hidden="true" />}
                              {oos ? 'Out of Stock' : fb === 'added' ? 'Added' : fb === 'max' ? 'Max in cart' : 'Add to Cart'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggle(p.id)}
                            aria-label={`Remove ${p.name} from wishlist`}
                            className="h-7 w-7 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        {count > 0 && (
          <div
            className="border-t border-espresso/10 px-5 py-4"
            style={{ backgroundColor: '#E8CAA8', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <Link
              to="/wishlist"
              onClick={onClose}
              className="block w-full text-center py-3 rounded-full border-2 border-primary text-primary font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
            >
              View Full Wishlist
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
