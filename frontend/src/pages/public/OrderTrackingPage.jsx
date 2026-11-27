import { useState, useEffect, useId, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { formatINR } from '../../services/cart';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const STATUS_LABELS = {
  pending: 'Order Placed',
  paid: 'Payment Confirmed',
  processing: 'Being Prepared',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Payment Failed',
  abandoned: 'Payment not completed',
};

const STATUS_ICONS = {
  pending: '📋',
  paid: '✅',
  processing: '⚙️',
  shipped: '🚚',
  delivered: '🎉',
  cancelled: '❌',
  failed: '❌',
  abandoned: '⏸️',
};

/* Pending = the order exists but the payment hasn't been confirmed yet. */
const PENDING_TEXT =
  'We haven\u2019t received the payment confirmation for this order yet. If you have paid, this updates automatically once Razorpay confirms the payment, so please don\u2019t pay again.';

const STOPPED_TEXT = {
  cancelled: 'This order has been cancelled.',
  failed: 'The payment for this order could not be completed.',
  abandoned:
    'The payment for this order was not completed, so it has not been processed. If money was debited from your account, please contact us on WhatsApp with your order ID.',
};

function StatusTimeline({ status }) {
  if (STOPPED_TEXT[status]) {
    const isCancelled = status === 'cancelled';
    return (
      <div
        className={`flex items-start gap-3 rounded-xl p-4 border ${
          isCancelled ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <span className="text-2xl" aria-hidden="true">{STATUS_ICONS[status]}</span>
        <div>
          <div className={`font-semibold ${isCancelled ? 'text-red-800' : 'text-amber-700'}`}>
            {STATUS_LABELS[status]}
          </div>
          <div className={`text-xs mt-0.5 ${isCancelled ? 'text-red-700' : 'text-amber-700'}`}>
            {STOPPED_TEXT[status]}
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="relative space-y-4">
      <p className="sr-only">Current status: {STATUS_LABELS[status] || status}</p>
      {/* Progress bar */}
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-espresso/10 hidden sm:block" aria-hidden="true" />
      <div
        className="absolute top-5 left-5 h-0.5 bg-primary hidden sm:block transition-all"
        aria-hidden="true"
        style={{ width: currentIdx >= 0 ? `${(currentIdx / (STATUS_STEPS.length - 1)) * 90}%` : '0%' }}
      />

      <ol className="flex flex-col sm:flex-row sm:justify-between gap-4 relative" aria-hidden="true">
        {STATUS_STEPS.map((step, idx) => {
          const done = currentIdx > idx;
          const active = currentIdx === idx;
          return (
            <li key={step} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-base z-10 transition-colors shrink-0 ${
                  done
                    ? 'bg-primary text-white'
                    : active
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-cream-200 text-espresso/70'
                }`}
              >
                {done ? '✓' : STATUS_ICONS[step]}
              </div>
              <div className={`text-xs text-center font-medium ${active ? 'text-primary font-semibold' : done ? 'text-espresso/80' : 'text-espresso/70'}`}>
                {STATUS_LABELS[step]}
              </div>
            </li>
          );
        })}
      </ol>
      {status === 'pending' && (
        <p className="text-xs text-espresso/80 bg-gold/10 border border-gold/30 rounded-xl px-3 py-2">{PENDING_TEXT}</p>
      )}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-xl border border-espresso/20 bg-cream-50 px-3.5 py-3 text-sm text-espresso placeholder:text-espresso/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

export function OrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const { state } = useLocation();
  // Prefill from the link: ?order_id=…[&phone=…]; the checkout pages pass the phone in router state
  const initialOrderId = (searchParams.get('order_id') || '').replace(/\D/g, '');
  const initialPhone = String(state?.phone || searchParams.get('phone') || '');

  const uid = useId();
  const orderFieldId = `${uid}-order`;
  const phoneFieldId = `${uid}-phone`;

  const [orderId, setOrderId] = useState(initialOrderId);
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const whatsappNumber = useWhatsAppNumber();
  const requestRef = useRef(0);
  const resultRef = useRef(null);

  const track = useCallback(async (id, ph) => {
    const cleanId = String(id || '').replace(/^#/, '').trim();
    const cleanPhone = String(ph || '').trim();
    if (!cleanId || !cleanPhone) {
      setError('Please enter both your order ID and phone number.');
      return;
    }
    if (!/^\d+$/.test(cleanId)) {
      setError('Order ID should be a number, e.g. 42.');
      return;
    }
    const req = ++requestRef.current;
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await api.get('/orders/track', {
        params: { order_id: cleanId, phone: cleanPhone },
      });
      if (req !== requestRef.current) return;
      setOrder(res.data);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (err) {
      if (req !== requestRef.current) return;
      if (err?.response?.status === 404) {
        setError('No order found with that ID and phone number. Please check and try again.');
      } else {
        setError(getErrorMessage(err, 'We couldn’t look up your order. Please try again.'));
      }
    } finally {
      if (req === requestRef.current) setLoading(false);
    }
  }, []);

  // Arriving from the order confirmation (/track-order?order_id=..&phone=..): look it up straight away
  useEffect(() => {
    if (initialOrderId && initialPhone) track(initialOrderId, initialPhone);
    // intentionally once, on mount, with the prefilled values
  }, []);

  const handleTrack = (e) => {
    e.preventDefault();
    track(orderId, phone);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gold-700 mb-2">Orders</div>
        <h1 className="font-display text-3xl font-semibold text-espresso">Track Your Order</h1>
        <p className="text-sm text-espresso/80 mt-1">Enter your order ID and phone number to check status.</p>
      </div>

      <form onSubmit={handleTrack} noValidate className="bg-ivory border border-gold/30 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={orderFieldId} className="block text-xs font-semibold text-espresso mb-1.5">
              Order ID <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id={orderFieldId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
              placeholder="e.g. 42"
              aria-describedby={`${orderFieldId}-hint`}
              className={INPUT_CLASS}
            />
            <p id={`${orderFieldId}-hint`} className="text-[11px] text-espresso/70 mt-1">Shown on your order confirmation page</p>
          </div>
          <div>
            <label htmlFor={phoneFieldId} className="block text-xs font-semibold text-espresso mb-1.5">
              Phone Number <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id={phoneFieldId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="10-digit mobile number"
              aria-describedby={`${phoneFieldId}-hint`}
              className={INPUT_CLASS}
            />
            <p id={`${phoneFieldId}-hint`} className="text-[11px] text-espresso/70 mt-1">The number you entered at checkout</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-primary text-cream font-semibold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {loading ? 'Tracking...' : 'Track Order'}
        </button>
      </form>

      {order && (
        <div className="space-y-5">
          {/* Order header */}
          <section
            ref={resultRef}
            tabIndex={-1}
            aria-label={`Order #${order.id} status`}
            className="bg-ivory border border-gold/30 rounded-2xl p-5 shadow-sm space-y-4 focus:outline-none"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-espresso/70">Order</div>
                <div className="text-xl font-bold text-espresso">#{order.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-espresso/70">Placed on</div>
                <div className="text-sm font-medium text-espresso/80">
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-espresso/70">Total</div>
                <div className="text-lg font-bold text-primary">
                  {formatINR(order.total_amount)}
                </div>
              </div>
            </div>

            {/* Status timeline */}
            <StatusTimeline status={order.status} />

            {order.updated_at && (
              <p className="text-xs text-espresso/70 text-center">
                Last updated: {new Date(order.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </section>

          {/* Order items */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <section className="bg-ivory border border-gold/30 rounded-2xl p-5 shadow-sm" aria-labelledby={`${uid}-items`}>
              <h2 id={`${uid}-items`} className="text-sm font-semibold text-espresso mb-3">Items Ordered</h2>
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg bg-cream-200 overflow-hidden shrink-0">
                      {item.product_image_path ? (
                        <img src={mediaUrl(item.product_image_path)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-espresso/60" aria-hidden="true">—</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-espresso truncate">{item.product_name}</div>
                      <div className="text-xs text-espresso/70">
                        {formatINR(item.price)} × {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-espresso shrink-0">
                      {formatINR(Number(item.price) * item.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* WhatsApp help */}
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-espresso/85">
              <span className="font-semibold">Need help with your order?</span> Chat with us on WhatsApp.
            </div>
            <a
              href={whatsappLink(whatsappNumber, `Namaste! I need help with my Bhaktijyot order #${order.id}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark shrink-0 transition-colors"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
