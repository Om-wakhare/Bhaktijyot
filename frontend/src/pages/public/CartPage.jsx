import { Link } from 'react-router-dom';
import { useCart } from '../../services/cart';
import { mediaUrl } from '../../services/media';

export function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-5">
        <div className="h-20 w-20 rounded-full bg-ivory-200 mx-auto flex items-center justify-center">
          <svg className="h-8 w-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-espresso">Your cart is empty</h1>
        <p className="text-sm text-warmBrown/60">Browse our products and add items to your cart.</p>
        <Link to="/products" className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="font-display text-3xl font-semibold text-espresso">Shopping Cart</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="h-24 w-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {item.image_path ? (
                  <img
                    src={mediaUrl(item.image_path)}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.product_id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-primary line-clamp-2"
                >
                  {item.name}
                </Link>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-primary-dark">
                    ₹ {item.price.toLocaleString('en-IN')}
                  </span>
                  {item.mrp && item.mrp > item.price && (
                    <span className="text-xs text-gray-500 line-through">
                      ₹ {item.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="px-3 py-1.5 text-sm font-semibold text-gray-900 border-x border-gray-300 min-w-[40px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-sm font-bold text-gray-900 shrink-0">
                ₹ {(item.price * item.quantity).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-fit sticky top-28 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-gray-700">
                <span className="truncate mr-2">
                  {item.name} × {item.quantity}
                </span>
                <span className="shrink-0 font-semibold">
                  ₹ {(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>₹ {totalAmount.toLocaleString('en-IN')}</span>
          </div>

          <Link
            to="/checkout"
            className="block w-full text-center px-5 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
          >
            Proceed to Checkout
          </Link>

          <Link
            to="/products"
            className="block w-full text-center text-xs text-primary font-semibold hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
