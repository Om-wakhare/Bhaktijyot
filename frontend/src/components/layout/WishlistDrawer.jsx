import { useEffect, useState } from 'react';
import { X, Heart, Gem, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../services/wishlist';
import { useCart } from '../../services/cart';
import { mediaUrl } from '../../services/media';
import api from '../../services/apiClient';

export function WishlistDrawer({ open, onClose }) {
  const { items: ids, toggle, count } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || ids.length === 0) { setProducts([]); return; }
    setLoading(true);
    Promise.all(
      ids.map((id) => api.get(`/products/${id}`).then((r) => r.data).catch(() => null))
    )
      .then((results) => setProducts(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [open, ids]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-96 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#F4E4D1' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-espresso/10">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" fill="currentColor" />
            <h2 className="text-base font-semibold text-espresso">Wishlist ({count})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-espresso/10 transition-colors text-espresso/50 hover:text-espresso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <Heart className="h-14 w-14 text-espresso/10" />
              <p className="text-espresso/50 text-sm font-medium">Your wishlist is empty</p>
              <Link
                to="/products"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : loading ? (
            Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl border border-espresso/10 bg-white/40 animate-pulse">
                <div className="h-16 w-16 rounded-xl shrink-0" style={{ backgroundColor: '#E8CAA8' }} />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: '#E8CAA8' }} />
                  <div className="h-3 rounded-full w-1/3" style={{ backgroundColor: '#E8CAA8' }} />
                </div>
              </div>
            ))
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="flex gap-3 p-3 rounded-2xl border border-espresso/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
              >
                {/* Image */}
                <Link to={`/products/${p.id}`} onClick={onClose} className="shrink-0">
                  <div className="h-16 w-16 rounded-xl overflow-hidden" style={{ backgroundColor: '#E8CAA8' }}>
                    {p.image_path ? (
                      <img src={mediaUrl(p.image_path)} alt={p.name} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Gem className="h-6 w-6 text-espresso/30" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${p.id}`} onClick={onClose}>
                    <p className="text-sm font-medium text-espresso line-clamp-2 leading-snug hover:text-primary transition-colors">{p.name}</p>
                  </Link>
                  {p.price != null && (
                    <p className="text-sm font-bold text-gold mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => addItem(p)}
                      disabled={p.stock === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-40 transition-colors"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {count > 0 && (
          <div className="border-t border-espresso/10 px-5 py-4" style={{ backgroundColor: '#E8CAA8' }}>
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
