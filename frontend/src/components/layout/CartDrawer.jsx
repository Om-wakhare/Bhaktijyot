import { X, Minus, Plus, Trash2, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../services/cart';
import { mediaUrl } from '../../services/media';

import catIdols     from '../../assets/cat-idols.png';
import catDiya      from '../../assets/cat-diya.png';
import catRudraksha from '../../assets/cat-rudraksha.png';
import catPooja     from '../../assets/cat-pooja.png';

const FREE_SHIPPING = 1500;

const CATEGORIES = [
  { label: 'Gemstones',        to: '/products?world=gemstones', img: catIdols     },
  { label: 'Crystal Bracelets', to: '/products?world=crystals',  img: catRudraksha },
  { label: 'Diya & Diyas',     to: '/products?q=diya',          img: catDiya      },
  { label: 'Pooja Essentials', to: '/products?world=pooja',      img: catPooja     },
];

const TOP_PICKS = [
  { label: 'Amethyst Bracelet',     price: '₹1,299', to: '/products?q=amethyst'     },
  { label: 'Rose Quartz Pendant',   price: '₹899',   to: '/products?q=rose+quartz'  },
  { label: 'Rudraksha Mala',        price: '₹749',   to: '/products?q=rudraksha'    },
];

export function CartDrawer({ open, onClose }) {
  const { items, removeItem, updateQuantity, totalAmount } = useCart();

  const freeShippingLeft = Math.max(0, FREE_SHIPPING - totalAmount);
  const progress         = Math.min(100, (totalAmount / FREE_SHIPPING) * 100);
  const hasItems         = items.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[400px] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#F4E4D1' }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/60 border-b border-espresso/10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black tracking-[0.18em] uppercase text-espresso">
              Your Cart
            </h2>
            <span
              className="h-5 w-5 flex items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: '#1C1209' }}
            >
              {items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-espresso/10 transition-colors text-espresso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Free shipping bar (only when items present) ─── */}
        {hasItems && (
          <div className="px-5 pt-3 pb-2 bg-white/40 border-b border-espresso/8">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#E8CAA8' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: '#1D3D2C' }}
              />
            </div>
            {freeShippingLeft > 0 ? (
              <p className="mt-1.5 text-[11px] text-center text-espresso/60 font-medium">
                Add <span className="font-bold text-espresso">₹{freeShippingLeft.toLocaleString('en-IN')}</span> more for{' '}
                <span className="font-bold text-primary">Free Shipping</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-center font-bold text-primary">
                🎉 You've unlocked Free Shipping!
              </p>
            )}
          </div>
        )}

        {/* ── Scrollable body ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── EMPTY STATE ──────────────────────────────────── */}
          {!hasItems && (
            <div className="px-5 pt-6 pb-4">
              {/* Illustration */}
              <div className="flex flex-col items-center py-5 text-center">
                <div className="h-20 w-20 flex items-center justify-center rounded-full mb-4"
                     style={{ background: '#E8CAA8' }}>
                  <Package className="h-10 w-10" style={{ color: '#C9A84C' }} />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-espresso">
                  Your cart is feeling empty.
                </p>
                <p className="mt-1 text-xs text-espresso/50 font-medium">
                  We can help out with that!
                </p>
              </div>

              {/* 2×2 Category tiles */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.label}
                    to={cat.to}
                    onClick={onClose}
                    className="relative overflow-hidden rounded-xl group"
                    style={{ paddingBottom: '70%' }}
                  >
                    <img
                      src={cat.img}
                      alt={cat.label}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0"
                         style={{ background: 'linear-gradient(to top, rgba(28,18,9,0.75) 0%, transparent 55%)' }} />
                    <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                      {cat.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Top picks */}
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-espresso mb-3">
                  Selling Fast! Top Picks for You:
                </p>
                <div className="space-y-2">
                  {TOP_PICKS.map((pick) => (
                    <div key={pick.label}
                         className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/70 border border-espresso/8">
                      <div>
                        <p className="text-xs font-semibold text-espresso">{pick.label}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: '#C9A84C' }}>{pick.price}</p>
                      </div>
                      <Link
                        to={pick.to}
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:opacity-90"
                        style={{ background: '#1D3D2C' }}
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ITEMS ────────────────────────────────────────── */}
          {hasItems && (
            <div className="px-5 pt-4 pb-2 space-y-3">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex gap-3 p-3 rounded-2xl bg-white/70 border border-espresso/8"
                >
                  {/* Image */}
                  <Link
                    to={`/products/${item.product_id}`}
                    onClick={onClose}
                    className="shrink-0"
                  >
                    <div
                      className="h-18 w-18 rounded-xl overflow-hidden"
                      style={{ width: 72, height: 72, backgroundColor: '#E8CAA8' }}
                    >
                      {item.image_path ? (
                        <img
                          src={mediaUrl(item.image_path)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-espresso/30" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-espresso line-clamp-2 leading-snug flex-1">
                        {item.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product_id)}
                        className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full hover:bg-red-50 text-espresso/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-sm font-black mt-1" style={{ color: '#1D3D2C' }}>
                      ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                    </p>

                    {item.quantity > 1 && (
                      <p className="text-[10px] text-espresso/40 line-through">
                        ₹{Number(item.price).toLocaleString('en-IN')} each
                      </p>
                    )}

                    {/* Qty controls */}
                    <div className="flex items-center gap-1 mt-2 w-fit border border-espresso/15 rounded-lg overflow-hidden bg-white/80">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="h-7 w-7 flex items-center justify-center text-espresso hover:bg-espresso/8 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-espresso">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="h-7 w-7 flex items-center justify-center text-espresso hover:bg-espresso/8 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Don't miss this */}
              <div className="mt-3 rounded-2xl overflow-hidden border border-espresso/8 bg-white/50">
                <p className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-espresso">
                  Don't miss these picks!
                </p>
                <div className="px-4 pb-3 space-y-2">
                  {TOP_PICKS.slice(0, 2).map((pick) => (
                    <div key={pick.label}
                         className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-espresso">{pick.label}</p>
                        <p className="text-xs font-bold" style={{ color: '#C9A84C' }}>{pick.price}</p>
                      </div>
                      <Link
                        to={pick.to}
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white"
                        style={{ background: '#1D3D2C' }}
                      >
                        Add
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        {hasItems && (
          <div className="border-t border-espresso/10 bg-white/60 px-5 py-4 space-y-3">
            {/* Subtotal row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-espresso">Subtotal</span>
              <span className="text-lg font-black text-espresso">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

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
              to="/checkout"
              onClick={onClose}
              className="block w-full text-center py-3 rounded-xl text-xs font-black uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1C1209' }}
            >
              🔒 Proceed to Checkout
            </Link>

            <p className="text-center text-[10px] text-espresso/40 font-medium">
              Taxes & shipping calculated at checkout
            </p>
          </div>
        )}
      </div>
    </>
  );
}
