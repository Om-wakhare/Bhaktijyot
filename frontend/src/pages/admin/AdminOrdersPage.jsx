import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import {
  Card, EmptyState, ErrorState, LoadingState, Page, Pagination, Pill, Select, cn,
} from '../../components/admin/ui';
import { mediaUrl } from '../../services/media';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import {
  ORDER_FILTER_STATUSES, ORDER_SETTABLE_STATUSES, ORDER_STATUS_RANK, formatDateTime, formatINR,
  orderStatusMeta, useLatestRequest, whatsappLink,
} from '../../components/admin/adminUtils';

const LIMIT = 20;
const RELEASED = new Set(['cancelled', 'abandoned']);

/** Split order notes into customer text and "[system]" lines. */
function splitNotes(notes) {
  const lines = String(notes ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return {
    customer: lines.filter((l) => !l.startsWith('[system]')),
    system: lines.filter((l) => l.startsWith('[system]')).map((l) => l.replace(/^\[system\]\s*/, '')),
  };
}

/** Returns confirm-dialog options when the change needs confirmation, otherwise null. */
function confirmationFor(order, next) {
  const from = order.status;
  const fromLabel = orderStatusMeta(from).label;
  const toLabel = orderStatusMeta(next).label;
  if (next === 'cancelled') {
    return {
      title: `Cancel order #${order.id}?`,
      message:
        'Reserved stock will be released back to inventory.' +
        (['paid', 'processing', 'shipped', 'delivered'].includes(from)
          ? ' This does not refund the customer — issue any refund from the Razorpay dashboard.'
          : ''),
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      tone: 'danger',
    };
  }
  if (RELEASED.has(from)) {
    return {
      title: `Reopen order #${order.id} as “${toLabel}”?`,
      message: `This order is “${fromLabel}”. Moving it back to an active status reserves its stock again (it fails if there isn't enough stock left).`,
      confirmLabel: `Set to ${toLabel}`,
    };
  }
  const a = ORDER_STATUS_RANK[from];
  const b = ORDER_STATUS_RANK[next];
  if (a !== undefined && b !== undefined && b < a) {
    return {
      title: `Move order #${order.id} back to “${toLabel}”?`,
      message: `It is currently “${fromLabel}”. Moving an order backwards is unusual — make sure this is intended.`,
      confirmLabel: `Set to ${toLabel}`,
    };
  }
  return null;
}

export function AdminOrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const beginRequest = useLatestRequest();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter + page live in the URL (?status=paid&page=2) so dashboard links and the back button work
  const rawStatus = searchParams.get('status') || '';
  const statusFilter = ORDER_FILTER_STATUSES.includes(rawStatus) ? rawStatus : '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter) params.status_filter = statusFilter;
      const res = await api.get('/orders', { params });
      if (!isCurrent()) return;
      const items = res.data?.items || [];
      const nextTotal = res.data?.total || 0;
      // Past the last page (e.g. the only order on it moved to another status) — go to the last page
      if (!items.length && page > 1 && nextTotal > 0) {
        const last = Math.max(1, Math.ceil(nextTotal / LIMIT));
        const next = {};
        if (statusFilter) next.status = statusFilter;
        if (last > 1) next.page = String(last);
        setSearchParams(next, { replace: true });
        return;
      }
      setOrders(items);
      setTotal(nextTotal);
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Could not load orders.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [page, statusFilter, beginRequest, setSearchParams]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const setFilter = (s) => {
    setExpandedId(null);
    setSearchParams(s ? { status: s } : {});
  };

  const setPage = (p) => {
    const next = {};
    if (statusFilter) next.status = statusFilter;
    if (p > 1) next.page = String(p);
    setSearchParams(next);
  };

  const handleStatusChange = async (order, next) => {
    if (!next || next === order.status) return;
    const dialog = confirmationFor(order, next);
    if (dialog && !(await confirm(dialog))) return;
    setUpdatingId(order.id);
    try {
      const res = await api.put(`/orders/${order.id}/status`, { status: next });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...res.data } : o)));
      toast.success(`Order #${order.id} is now ${orderStatusMeta(next).label.toLowerCase()}`);
      // Refresh so filtered views and totals stay accurate
      loadOrders();
    } catch (err) {
      // e.g. 409 when there isn't enough stock to re-reserve
      toast.error(getErrorMessage(err, 'Failed to update the order status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const filterMeta = statusFilter ? orderStatusMeta(statusFilter) : null;

  return (
    <Page
      title="Orders"
      description={
        loading && !orders.length
          ? 'Loading…'
          : `${total} ${filterMeta ? `“${filterMeta.label}” ` : ''}order${total !== 1 ? 's' : ''}`
      }
    >
      <Card>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-espresso/70">Filter:</span>
          {[''].concat(ORDER_FILTER_STATUSES).map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(s)}
                className={cn(
                  'min-h-[36px] px-3 py-1.5 rounded-full text-xs font-semibold border',
                  active
                    ? 'bg-primary text-white border-primary'
                    : s === 'abandoned'
                      ? 'border-espresso/10 text-espresso/60 hover:bg-espresso/5'
                      : 'border-espresso/20 text-espresso/80 hover:bg-espresso/5',
                )}
              >
                {s ? orderStatusMeta(s).label : 'All'}
              </button>
            );
          })}
        </div>

        {loading && !orders.length ? (
          <LoadingState label="Loading orders…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadOrders} />
        ) : orders.length === 0 ? (
          <EmptyState>{statusFilter ? 'No orders with this status.' : 'No orders yet.'}</EmptyState>
        ) : (
          <div className={cn('space-y-3', loading && 'opacity-60 transition-opacity')}>
            {orders.map((order) => {
              const meta = orderStatusMeta(order.status);
              const expanded = expandedId === order.id;
              const notes = splitNotes(order.notes);
              const items = order.items ?? [];
              const panelId = `order-panel-${order.id}`;
              return (
                <div key={order.id} className="border border-espresso/10 rounded-xl overflow-hidden">
                  {/* Order header */}
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                    className="w-full text-left px-4 py-3 bg-ivory hover:bg-espresso/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap min-w-0">
                      <span className="text-sm font-bold text-espresso">#{order.id}</span>
                      <Pill className={cn('uppercase tracking-wide', meta.className)}>{meta.label}</Pill>
                      <span className={cn('text-sm font-semibold', order.status === 'abandoned' ? 'text-espresso/60' : 'text-espresso')}>
                        {formatINR(order.total_amount)}
                      </span>
                      <span className="text-xs text-espresso/60">{order.customer_name}</span>
                      <span className="text-xs text-espresso/60">{formatDateTime(order.created_at)}</span>
                      {notes.system.length > 0 && (
                        <span className="text-[11px] font-semibold text-gold-700">system note</span>
                      )}
                    </div>
                    <span className="text-espresso/60 shrink-0" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Order details */}
                  {expanded && (
                    <div id={panelId} className="px-4 py-4 space-y-4 border-t border-espresso/10">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold text-espresso/60 mb-1">Customer</div>
                          <div className="text-sm text-espresso">{order.customer_name}</div>
                          {order.customer_phone && (
                            <div className="flex flex-wrap items-center gap-x-3 text-xs">
                              <a href={`tel:${order.customer_phone}`} className="font-semibold text-primary hover:underline">
                                {order.customer_phone}
                              </a>
                              {whatsappLink(order.customer_phone) && (
                                <a
                                  href={whatsappLink(order.customer_phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-emerald-800 hover:underline"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                          {order.customer_email && <div className="text-xs text-espresso/70">{order.customer_email}</div>}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-espresso/60 mb-1">Shipping Address</div>
                          <div className="text-sm text-espresso">{order.customer_address}</div>
                          <div className="text-xs text-espresso/70">
                            {[order.customer_city, order.customer_state].filter(Boolean).join(', ')}
                            {order.customer_pincode ? ` — ${order.customer_pincode}` : ''}
                          </div>
                        </div>
                      </div>

                      {(order.razorpay_order_id || order.razorpay_payment_id) && (
                        <div>
                          <div className="text-xs font-semibold text-espresso/60 mb-1">Payment</div>
                          <div className="text-xs text-espresso/80 space-y-0.5">
                            {order.razorpay_order_id && <div>Razorpay Order: <span className="font-mono">{order.razorpay_order_id}</span></div>}
                            {order.razorpay_payment_id && <div>Payment ID: <span className="font-mono">{order.razorpay_payment_id}</span></div>}
                          </div>
                        </div>
                      )}

                      {notes.customer.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-espresso/60 mb-1">Note from the customer</div>
                          <div className="text-sm text-espresso/80 whitespace-pre-line">{notes.customer.join('\n')}</div>
                        </div>
                      )}

                      {notes.system.length > 0 && (
                        <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2">
                          <div className="text-xs font-semibold text-gold-800 mb-1">System notes (added automatically)</div>
                          <ul className="text-xs text-gold-900 space-y-0.5 list-disc pl-4">
                            {notes.system.map((line, i) => <li key={i}>{line}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Items */}
                      <div>
                        <div className="text-xs font-semibold text-espresso/60 mb-2">Items ({items.length})</div>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-ivory rounded-lg p-2">
                              <div className="h-12 w-12 rounded-md bg-espresso/10 overflow-hidden shrink-0">
                                {item.product_image_path ? (
                                  <img src={mediaUrl(item.product_image_path)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[10px] text-espresso/60">—</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-espresso truncate">{item.product_name}</div>
                                <div className="text-xs text-espresso/70">
                                  {formatINR(item.price)} × {item.quantity}
                                  {' = '}
                                  <span className="font-semibold">{formatINR(Number(item.price) * item.quantity)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Update status */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-espresso/10">
                        <label htmlFor={`status-${order.id}`} className="text-xs font-semibold text-espresso/70">
                          Status:
                        </label>
                        <Select
                          id={`status-${order.id}`}
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className="w-auto min-w-[180px]"
                        >
                          {!ORDER_SETTABLE_STATUSES.includes(order.status) && (
                            <option value={order.status} disabled>{meta.label}</option>
                          )}
                          {ORDER_SETTABLE_STATUSES.map((s) => (
                            <option key={s} value={s}>{orderStatusMeta(s).label}</option>
                          ))}
                        </Select>
                        {updatingId === order.id && <span className="text-xs text-espresso/60">Updating…</span>}
                        {order.status === 'abandoned' && (
                          <span className="text-[11px] text-espresso/60">
                            The customer didn’t finish paying. Set a status only if you received payment another way.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={loading}
        />
      </Card>
    </Page>
  );
}
