import { useEffect, useState } from 'react';
import api from '../../services/apiClient';
import { Button, Card, Page } from '../../components/admin/ui';
import { mediaUrl } from '../../services/media';

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status_filter = statusFilter;
      const res = await api.get('/orders', { params });
      setOrders(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      loadOrders();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Page title="Orders" subtitle={`${total} total orders`}>
      <Card>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-gray-600">Filter:</span>
          <button
            type="button"
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              !statusFilter ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${
                statusFilter === s ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-8 text-center">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center">No orders found.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Order Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4 flex-wrap min-w-0">
                    <span className="text-sm font-bold text-gray-900">#{order.id}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹ {Number(order.total_amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-gray-500">{order.customer_name}</span>
                    <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <span className="text-gray-400 shrink-0">{expandedId === order.id ? '▲' : '▼'}</span>
                </button>

                {/* Order Details (expanded) */}
                {expandedId === order.id && (
                  <div className="px-4 py-4 space-y-4 border-t border-gray-200">
                    {/* Customer Info */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Customer</div>
                        <div className="text-sm text-gray-900">{order.customer_name}</div>
                        <div className="text-xs text-gray-600">{order.customer_phone}</div>
                        {order.customer_email && <div className="text-xs text-gray-600">{order.customer_email}</div>}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Shipping Address</div>
                        <div className="text-sm text-gray-900">{order.customer_address}</div>
                        <div className="text-xs text-gray-600">
                          {order.customer_city}, {order.customer_state} — {order.customer_pincode}
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Payment</div>
                      <div className="text-xs text-gray-700 space-y-0.5">
                        {order.razorpay_order_id && <div>Razorpay Order: <span className="font-mono">{order.razorpay_order_id}</span></div>}
                        {order.razorpay_payment_id && <div>Payment ID: <span className="font-mono">{order.razorpay_payment_id}</span></div>}
                      </div>
                    </div>

                    {order.notes && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Notes</div>
                        <div className="text-sm text-gray-700">{order.notes}</div>
                      </div>
                    )}

                    {/* Items */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2">Items ({order.items.length})</div>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                            <div className="h-12 w-12 rounded-md bg-gray-200 overflow-hidden shrink-0">
                              {item.product_image_path ? (
                                <img src={mediaUrl(item.product_image_path)} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">—</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{item.product_name}</div>
                              <div className="text-xs text-gray-600">
                                ₹ {Number(item.price).toLocaleString('en-IN')} × {item.quantity}
                                {' = '}
                                <span className="font-semibold">₹ {(Number(item.price) * item.quantity).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Update Status */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <span className="text-xs font-semibold text-gray-600">Update status:</span>
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={updating || order.status === s}
                          onClick={() => handleStatusChange(order.id, s)}
                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold capitalize ${
                            order.status === s
                              ? 'bg-primary text-white cursor-default'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-xs text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </Page>
  );
}
