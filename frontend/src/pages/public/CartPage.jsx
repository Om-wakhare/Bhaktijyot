import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Package, Heart, Lock } from 'lucide-react';
import { useCart, formatINR, lineIssue, maxQuantityFor } from '../../services/cart';
import { useWishlist } from '../../services/wishlist';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { mediaUrl } from '../../services/media';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

const WORLD_LINKS = [
  { to: '/products?world=pooja',     label: 'Pooja Samagri' },
  { to: '/products?world=crystals',  label: 'Crystal World' },
  { to: '/products?world=gemstones', label: 'Gemstones' },
];

const ISSUE_TEXT = {
  unavailable: 'This product is no longer available. Please remove it.',
  price_on_request: 'Price on request — can’t be paid online.',
  out_of_stock: 'Out of stock. Please remove it to continue.',
  not_enough_stock: 'Not enough stock for this quantity.',
};

export function CartPage() {
  const { items, removeItem, updateQuantity, refresh, totalAmount, totalItems, blockedCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const whatsappNumber = useWhatsAppNumber();
  // Prices and stock are re-read from the server when the page opens
  const [checking, setChecking] = useState(items.length > 0);
  const [changedNote, setChangedNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    refresh()
      .then(({ changed }) => {
        if (!cancelled && changed.length) {
          setChangedNote(
            changed.length === 1
              ? `The price or available quantity of “${changed[0]}” has changed since you added it.`
              : `Prices or available quantities have changed for ${changed.length} items since you added them.`,
          );
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <div className="h-20 w-20 rounded-full bg-ivory-300/60 mx-auto flex items-center justify-center">
          <Package className="h-9 w-9 text-gold-700" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-espresso">Your cart is empty</h1>
        <p className="text-sm text-espresso/75">
          Explore our gemstones, crystals and pooja essentials and add your favourites here.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/products" className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors">
            Browse Products
          </Link>
          {wishlistCount > 0 && (
            <Link to="/wishlist" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/8 transition-colors">
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
    unpricedNames.length
      ? `Namaste! I'd like to know the price of: ${unpricedNames.join(', ')}`
      : `Namaste! I have a question about the items in my Bhaktijyot cart.`,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="font-display text-3xl font-semibold text-espresso">
        Shopping Cart <span className="text-base font-sans font-medium text-espresso/70">({totalItems} item{totalItems === 1 ? '' : 's'})</span>
      </h1>

      {changedNote && (
        <div role="status" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-espresso">
          {changedNote} Your cart now shows the current details.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px] items-start">
        {/* Cart Items */}
        <ul className="space-y-3">
          {items.map((item) => {
            const issue = lineIssue(item);
            const blocked = issue && issue !== 'price_on_request';
            const priced = item.price !== null;
            const max = maxQuantityFor(item.stock);
            const canChangeQty = issue === null || issue === 'not_enough_stock';
            const href = `/products/${item.product_id}`;
            return (
              <li
                key={item.product_id}
                className={`flex gap-4 rounded-xl p-4 shadow-sm border ${blocked ? 'bg-red-50/60 border-red-200' : 'bg-ivory border-gold/25'}`}
              >
                <Link to={href} tabIndex={-1} aria-hidden="true" className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-cream-200 overflow-hidden shrink-0">
                  {item.image_path ? (
                    <img
                      src={mediaUrl(item.image_path)}
                      alt=""
                      className={`h-full w-full object-cover ${blocked ? 'opacity-60' : ''}`}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-7 w-7 text-espresso/40" aria-hidden="true" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={href}
                      className="text-sm font-semibold text-espresso hover:text-primary line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <div className="text-sm font-bold text-espresso shrink-0">
                      {priced ? formatINR(item.price * item.quantity) : '—'}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {priced && (
                      <>
                        <span className="text-sm font-bold text-primary">{formatINR(item.price)}</span>
                        {item.mrp !== null && item.mrp > item.price && (
                          <span className="text-xs text-espresso/70 line-through">
                            <span className="sr-only">MRP </span>{formatINR(item.mrp)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {issue && (
                    <p className={`mt-1 text-xs font-semibold ${issue === 'price_on_request' ? 'text-amber-700' : 'text-red-700'}`}>
                      {ISSUE_TEXT[issue]}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    {canChangeQty && (
                      <div className="flex items-center border border-espresso/15 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="h-9 w-9 flex items-center justify-center text-espresso hover:bg-cream disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span className="px-3 text-sm font-semibold text-espresso border-x border-espresso/15 min-w-[40px] text-center leading-9" aria-live="polite">
                          <span className="sr-only">Quantity </span>{item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= max}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-9 w-9 flex items-center justify-center text-espresso hover:bg-cream disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="inline-flex items-center gap-1 h-9 px-1 text-xs font-semibold text-red-700 hover:text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                  {item.stock > 0 && item.quantity >= max && max < 99 && (
                    <p className="mt-1 text-[11px] text-espresso/70">Only {item.stock} available</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Order Summary */}
        <aside
          aria-labelledby="cart-summary-heading"
          className="bg-ivory border border-gold/30 rounded-xl p-5 shadow-sm lg:sticky lg:top-32 space-y-4"
        >
          <h2 id="cart-summary-heading" className="font-display text-lg font-semibold text-espresso">Order Summary</h2>

          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-espresso/80">
                <span className="truncate mr-2">
                  {item.name} × {item.quantity}
                </span>
                <span className="shrink-0 font-semibold">
                  {item.price !== null ? formatINR(item.price * item.quantity) : 'On request'}
                </span>
              </div>
            ))}
            {/* The server adds no shipping charge to the order total (see POST /orders/checkout) */}
            <div className="flex justify-between text-espresso/80">
              <span>Shipping</span>
              <span className="font-semibold text-primary">Free</span>
            </div>
          </div>

          <div className="border-t border-gold/30 pt-3 flex justify-between text-base font-bold text-espresso">
            <span>Subtotal</span>
            <span>{formatINR(totalAmount)}</span>
          </div>
          <p className="text-xs text-espresso/70 -mt-2" aria-live="polite">
            {checking ? 'Checking current prices and stock…' : 'The final amount is confirmed at checkout.'}
          </p>

          {blockedCount > 0 ? (
            <div role="alert" className="space-y-3">
              <p className="text-xs leading-relaxed rounded-lg px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-700">
                {blockedCount === 1 ? 'One item' : `${blockedCount} items`} in your cart can&apos;t be paid for
                online right now. Remove {blockedCount === 1 ? 'it' : 'them'} to continue to checkout
                {unpricedNames.length > 0 ? ', or ask us for a price on WhatsApp' : ''}.
              </p>
              <a
                href={enquiryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-cream transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {unpricedNames.length > 0 ? 'Ask for prices on WhatsApp' : 'Ask us on WhatsApp'}
              </a>
              <span
                aria-disabled="true"
                className="block w-full text-center px-5 py-3 rounded-full bg-cream-200 text-espresso/70 text-sm font-semibold cursor-not-allowed"
              >
                Proceed to Checkout
              </span>
            </div>
          ) : (
            <Link
              to="/checkout"
              className="flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Proceed to Checkout
            </Link>
          )}

          <Link
            to="/products"
            className="block w-full text-center text-sm text-primary font-semibold hover:underline"
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
