import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

export function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center space-y-6">
      <div className="h-20 w-20 rounded-full bg-teal/10 mx-auto flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-teal" />
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-teal">Payment Confirmed</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">Order Placed!</h1>
        <p className="text-warmBrown/60 text-sm leading-relaxed">
          Thank you for your purchase. Your payment has been confirmed.
          {orderId && (
            <> Your order ID is <span className="font-bold text-warmBrown">#{orderId}</span>.</>
          )}
        </p>
        <p className="text-warmBrown/60 text-sm">
          We'll process your order shortly and send updates on WhatsApp.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {orderId && (
          <Link
            to={`/track-order`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <Package className="h-4 w-4" />
            Track Order
          </Link>
        )}
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
        >
          Continue Shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
