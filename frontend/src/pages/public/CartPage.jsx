import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Package, Truck, Heart } from 'lucide-react';
import { useCart, formatINR, maxQuantityFor } from '../../services/cart';
import { useWishlist } from '../../services/wishlist';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { mediaUrl } from '../../services/media';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

const WORLD_LINKS = [
  { to: '/products?world=pooja',     label: 'Pooja Samagri' },
  { to: '/products?world=crystals',  label: 'Crystal World' },
  { to: '/products?world=gemstones', label: 'Gemstones' },
];

export function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount, totalItems, hasPriceOnRequest } = useCart();
  const { count: wishlistCount } = useWishlist();
  const whatsappNumber = useWhatsAppNumber();

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <div className="h-20 w-20 rounded-full bg-ivory-300/60 mx-auto flex items-center justify-center">
          <Package className="h-9 w-9 text-gold-dark" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-espresso">Your cart is empty</h1>
        <p className="text-sm text-espresso/60">
          Explore our gemstones, crystals and pooja essentials and add your favourites here.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/products" className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
            Browse Products
          </Link>
          {wishlistCount > 0 && (
            <Link to="/wishlist" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/8 transition-colors">
              <Heart className="h-4 w-4" aria-hidden="true" />
              View Wishlist ({wishlistCount})
            </Link>
          )}
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {WORLD_LINKS.map((w) => (
            <li key={w.to}>
              <Link
                to={w.to}
                className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold border border-gold/40 text-espresso/80 bg-ivory hover:border-gold hover:text-espresso transition-colors"
              >
                {w.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const unpricedNames = items.filter((i) => i.price === null).map((i) => i.name);
  const enquiryHref = whatsappLink(
    whatsappNumber,
    `Namaste! I'd like to know the price of: ${unpricedNames.join(', ')}`,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="font-display text-3xl font-semibold text-espresso">
        Shopping Cart <span className="text-base font-sans font-medium text-espresso/50">({totalItems} item{totalItems === 1 ? '' : 's'})</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        {/* Cart Items */}
        <ul className="space-y-3">
          {items.map((item) => {
            const priced = item.price !== null;
            const max = maxQuantityFor(item.stock);
            const href = `/products/${item.product_id}`;
            return (
              <li
                key={item.product_id}
                className="flex gap-4 bg-ivory border border-gold/25 rounded-xl p-4 shadow-sm"
              >
                <Link to={href} tabIndex={-1} aria-hidden="true" className="h-24 w-24 rounded-lg bg-cream-200 overflow-hidden shrink-0">
                  {item.image_path ? (
                    <img
                      src={mediaUrl(item.image_path)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-7 w-7 text-espresso/25" aria-hidden="true" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={href}
                    className="text-sm font-semibold text-espresso hover:text-primary line-clamp-2"
                  >
                    {item.name}
                  </Link>

                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {priced ? (
                      <>
                        <span className="text-sm font-bold text-primary">{formatINR(item.price)}</span>
                        {item.mrp !== null && item.mrp > item.price && (
                          <span className="text-xs text-espresso/50 line-through">
                            <span className="sr-only">MRP </span>{formatINR(item.mrp)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-amber-dark bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                        Price on request — can&apos;t be paid online
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center border border-espresso/15 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="h-8 w-8 flex items-center justify-center text-espresso hover:bg-cream disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="px-3 text-sm font-semibold text-espresso border-x border-espresso/15 min-w-[40px] text-center leading-8" aria-live="polite">
                        <span className="sr-only">Quantity </span>{item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= max}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="h-8 w-8 flex items-center justify-center text-espresso hover:bg-cream disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                  {item.stock > 0 && item.quantity >= max && max < 99 && (
                    <p className="mt-1 text-[11px] text-espresso/55">Only {item.stock} available</p>
                  )}
                </div>

                <div className="text-sm font-bold text-espresso shrink-0">
                  {priced ? formatINR(item.price * item.quantity) : '—'}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Order Summary */}
        <aside
          aria-labelledby="cart-summary-heading"
          className="bg-ivory border border-gold/30 rounded-xl p-5 shadow-sm h-fit lg:sticky lg:top-32 space-y-4"
        >
          <h2 id="cart-summary-heading" className="font-display text-lg font-semibold text-espresso">Order Summary</h2>

          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-espresso/75">
                <span className="truncate mr-2">
                  {item.name} × {item.quantity}
                </span>
                <span className="shrink-0 font-semibold">
                  {item.price !== null ? formatINR(item.price * item.quantity) : 'On request'}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-espresso/75">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                Shipping
              </span>
              <span className="font-semibold text-primary">Free</span>
            </div>
          </div>

          <div className="border-t border-gold/30 pt-3 flex justify-between text-base font-bold text-espresso">
            <span>Total</span>
            <span>{formatINR(totalAmount)}</span>
          </div>

          {hasPriceOnRequest ? (
            <div role="alert" className="space-y-3">
              <p className="text-xs leading-relaxed rounded-lg px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-700">
                {unpricedNames.length === 1 ? 'One item is' : 'Some items are'} &ldquo;price on request&rdquo; and
                can&apos;t be paid for online. Remove {unpricedNames.length === 1 ? 'it' : 'them'} to continue to
                checkout, or ask us for a price on WhatsApp.
              </p>
              <a
                href={enquiryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Enquire on WhatsApp
              </a>
              <button
                type="button"
                disabled
                className="block w-full text-center px-5 py-3 rounded-full bg-cream-200 text-espresso/50 text-sm font-semibold cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
            </div>
          ) : (
            <Link
              to="/checkout"
              className="block w-full text-center px-5 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              Proceed to Checkout
            </Link>
          )}

          <p className="text-center text-[11px] text-espresso/55">Free shipping on all orders</p>

          <Link
            to="/products"
            className="block w-full text-center text-xs text-primary font-semibold hover:underline"
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
