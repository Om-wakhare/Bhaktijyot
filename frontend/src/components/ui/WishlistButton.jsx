import { Heart } from 'lucide-react';
import { useWishlist } from '../../services/wishlist';

/**
 * Heart toggle button for wishlisting a product.
 * Props:
 *   productId — number | string
 *   size      — 'sm' | 'md'
 *   className — extra classes for the button
 */
export function WishlistButton({ productId, size = 'sm', className = '' }) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);
  const iconClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`flex items-center justify-center rounded-full transition-all duration-150 ${
        saved
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-white/80 text-espresso/40 hover:text-red-400 hover:bg-white'
      } ${className}`}
    >
      <Heart className={iconClass} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
