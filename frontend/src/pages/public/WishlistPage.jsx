import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Gem } from 'lucide-react';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { useCart } from '../../services/cart';
import { useWishlist } from '../../services/wishlist';
import { WishlistButton } from '../../components/ui/WishlistButton';
import { StarRating } from '../../components/ui/StarRating';

export function WishlistPage() {
  const { items: wishlistIds, count } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wishlistIds.length === 0) { setProducts([]); return; }
    setLoading(true);
    Promise.all(
      wishlistIds.map((id) => api.get(`/products/${id}`).then((r) => r.data).catch(() => null))
    )
      .then((results) => setProducts(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [wishlistIds]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gold">Saved</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">My Wishlist</h1>
        <p className="text-sm text-espresso/50">{count} item{count !== 1 ? 's' : ''} saved</p>
      </div>

      {count === 0 ? (
        <div className="text-center py-24 space-y-4">
          <Heart className="h-14 w-14 text-espresso/15 mx-auto" />
          <p className="text-espresso/50 font-medium">Your wishlist is empty.</p>
          <Link to="/products" className="inline-block px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
            Browse Products
          </Link>
        </div>
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-cream-200 animate-pulse">
              <div className="aspect-square bg-cream-200" />
              <div className="p-4 space-y-3">
                <div className="h-3.5 rounded-full bg-cream-200" />
                <div className="h-4 rounded-full bg-cream-200 w-1/2" />
                <div className="h-8 rounded-full bg-cream-200" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const hasDiscount = p?.mrp && p?.price && Number(p.mrp) > Number(p.price);
            const discountPct = hasDiscount ? Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100) : 0;
            return (
              <div key={p.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col border border-cream-200">
                <Link to={`/products/${p.id}`} className="block relative overflow-hidden">
                  <div className="aspect-square bg-cream-100">
                    {p.image_path ? (
                      <img src={mediaUrl(p.image_path)} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Gem className="h-12 w-12 text-primary/20" /></div>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber text-white text-[11px] font-bold">{discountPct}% OFF</span>
                  )}
                  <WishlistButton productId={p.id} className="absolute top-3 right-3 h-8 w-8 shadow-sm" />
                </Link>
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <Link to={`/products/${p.id}`}>
                    <h3 className="text-sm font-semibold text-espresso line-clamp-2 hover:text-primary transition-colors leading-snug">{p.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2">
                    {p.price != null && <span className="text-base font-bold text-primary">₹ {Number(p.price).toLocaleString('en-IN')}</span>}
                    {hasDiscount && <span className="text-xs text-espresso/40 line-through">₹ {Number(p.mrp).toLocaleString('en-IN')}</span>}
                  </div>
                  {p.rating_count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <StarRating value={p.rating_avg ?? 0} size="sm" />
                      <span className="text-xs text-espresso/60">({p.rating_count})</span>
                    </div>
                  )}
                  <div className="mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() => addItem(p)}
                      disabled={p.stock === 0}
                      className="w-full py-2.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-cream-200 disabled:text-espresso/40 transition-colors"
                    >
                      {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
