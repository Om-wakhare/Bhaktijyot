import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CircleCheck, Package, ArrowRight, Search } from 'lucide-react';
import { formatINR } from '../../services/cart';

function trackHref(orderId, phone) {
  const params = new URLSearchParams();
  if (orderId) params.set('order_id', String(orderId));
  if (phone) params.set('phone', String(phone));
  const qs = params.toString();
  return qs ? `/track-order?${qs}` : '/track-order';
}

/**
 * Shown after checkout. The confirmation is only displayed when we arrive here from the
 * checkout flow (router state); anyone opening the URL directly gets a neutral page that
 * points to order tracking instead of a false "Payment Confirmed".
 */
export function OrderSuccessPage() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const confirmed = state && state.orderId ? state : null;
  const queryOrderId = (searchParams.get('order_id') || '').replace(/\D/g, '');

  if (!confirmed) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-gold/15 border border-gold/40 mx-auto flex items-center justify-center">
          <Search className="h-9 w-9 text-gold-dark" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gold-dark">Orders</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-espresso">Looking for your order?</h1>
          <p className="text-espresso/65 text-sm leading-relaxed">
            Track it here with your order ID and the mobile number used at checkout.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to={trackHref(queryOrderId)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            Track Your Order
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const { orderId, phone, total } = confirmed;

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center space-y-6">
      <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center">
        <CircleCheck className="h-10 w-10 text-primary" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gold-dark">Payment Confirmed</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">Order Placed!</h1>
        <p className="text-espresso/70 text-sm leading-relaxed">
          Thank you for your purchase. Your payment has been confirmed.
        </p>
      </div>

      <dl className="mx-auto max-w-xs grid grid-cols-2 gap-3 text-sm bg-ivory border border-gold/30 rounded-xl p-4 text-left">
        <div>
          <dt className="text-xs text-espresso/55">Order ID</dt>
          <dd className="font-bold text-espresso">#{orderId}</dd>
        </div>
        {total !== undefined && total !== null && (
          <div>
            <dt className="text-xs text-espresso/55">Amount paid</dt>
            <dd className="font-bold text-espresso">{formatINR(total)}</dd>
          </div>
        )}
      </dl>

      <p className="text-espresso/65 text-sm">
        We&apos;ll process your order shortly and send updates on WhatsApp. Keep your order ID handy to track it.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          to={trackHref(orderId, phone)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          Track Order
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
        >
          Continue Shopping
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
