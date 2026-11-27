import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist, useWishlistProducts } from '../../services/wishlist';
import { ProductCard } from '../../components/ui/ProductCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

export function WishlistPage() {
  const { count } = useWishlist();
  // Fetches each saved product; ids that now 404 (deleted / unpublished) are pruned.
  const { products, loading, failedCount, retry } = useWishlistProducts(true);
  const showSkeleton = loading && products.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gold-700">Saved</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-espresso">My Wishlist</h1>
        <p className="text-sm text-espresso/70" aria-live="polite">
          {count} item{count !== 1 ? 's' : ''} saved
        </p>
      </div>

      {count === 0 ? (
        <div className="text-center py-24 space-y-4">
          <Heart className="h-14 w-14 text-espresso/15 mx-auto" aria-hidden="true" />
          <p className="text-espresso/80 font-medium">Your wishlist is empty.</p>
          <p className="text-sm text-espresso/70">Tap the heart on any product to save it here.</p>
          <Link to="/products" className="inline-block px-6 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          {failedCount > 0 && !loading && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span>
                We couldn&apos;t load {failedCount} of your saved item{failedCount > 1 ? 's' : ''}. Please check your connection.
              </span>
              <button
                type="button"
                onClick={retry}
                className="px-4 py-1.5 rounded-full border border-amber-700/40 font-semibold hover:bg-amber-100 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy={loading ? 'true' : undefined}>
            {showSkeleton
              ? Array.from({ length: Math.min(count, 8) }).map((_, i) => <SkeletonCard key={i} />)
              : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
