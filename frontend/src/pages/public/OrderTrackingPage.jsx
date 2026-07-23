import { useState, useEffect } from 'react';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const STATUS_LABELS = {
  pending: 'Order Placed',
  paid: 'Payment Confirmed',
  processing: 'Being Prepared',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Payment Failed',
};

const STATUS_ICONS = {
  pending: '📋',
  paid: '✅',
  processing: '⚙️',
  shipped: '🚚',
  delivered: '🎉',
  cancelled: '❌',
  failed: '❌',
};

function StatusTimeline({ status }) {
  const isCancelled = status === 'cancelled' || status === 'failed';
  const currentIdx = STATUS_STEPS.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <span className="text-2xl">{STATUS_ICONS[status]}</span>
        <div>
          <div className="font-semibold text-red-800">{STATUS_LABELS[status]}</div>
          <div className="text-xs text-red-600">
            {status === 'cancelled' ? 'This order has been cancelled.' : 'Payment could not be completed.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 hidden sm:block" />
      <div
        className="absolute top-5 left-5 h-0.5 bg-primary hidden sm:block transition-all"
        style={{ width: currentIdx >= 0 ? `${(currentIdx / (STATUS_STEPS.length - 1)) * 90}%` : '0%' }}
      />

      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 relative">
        {STATUS_STEPS.map((step, idx) => {
          const done = currentIdx > idx;
          const active = currentIdx === idx;
          return (
            <div key={step} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-base z-10 transition-colors shrink-0 ${
                  done
                    ? 'bg-primary text-white'
                    : active
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {done ? '✓' : STATUS_ICONS[step]}
              </div>
              <div className={`text-xs text-center font-medium ${active ? 'text-primary font-semibold' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {STATUS_LABELS[step]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('918484913170');

  // Load WhatsApp number from config once
  useEffect(() => {
    api.get('/site-config').then((res) => {
      if (res.data?.whatsapp_number) setWhatsappNumber(res.data.whatsapp_number);
    }).catch(() => {});
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId || !phone) return;
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await api.get('/orders/track', {
        params: { order_id: orderId, phone: phone.trim() },
      });
      setOrder(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('No order found with that ID and phone number. Please check and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-2">Orders</div>
        <h1 className="font-display text-3xl font-semibold text-espresso">Track Your Order</h1>
        <p className="text-sm text-warmBrown/60 mt-1">Enter your order ID and phone number to check status.</p>
      </div>

      <form onSubmit={handleTrack} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Order ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
              placeholder="e.g. 42"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-gray-400 mt-1">Found on your order confirmation page</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="10-digit mobile number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-gray-400 mt-1">Used during checkout</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? 'Tracking...' : 'Track Order'}
        </button>
      </form>

      {order && (
        <div className="space-y-5">
          {/* Order header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-gray-500">Order</div>
                <div className="text-xl font-bold text-gray-900">#{order.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Placed on</div>
                <div className="text-sm font-medium text-gray-700">
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-bold text-primary-dark">
                  ₹ {Number(order.total_amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Status timeline */}
            <StatusTimeline status={order.status} />

            {order.updated_at && (
              <p className="text-xs text-gray-400 text-center">
                Last updated: {new Date(order.updated_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Order items */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Items Ordered</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {item.product_image_path ? (
                      <img src={mediaUrl(item.product_image_path)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">—</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{item.product_name}</div>
                    <div className="text-xs text-gray-500">
                      ₹ {Number(item.price).toLocaleString('en-IN')} × {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-800 shrink-0">
                    ₹ {(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp help */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-800">
              <span className="font-semibold">Need help with your order?</span> Chat with us on WhatsApp.
            </div>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I need help with Order #${order.id}`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 shrink-0"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
