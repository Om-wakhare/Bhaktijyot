import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import { Button, Card, ErrorState, Page, Pill } from '../../components/admin/ui';
import {
  ORDER_FILTER_STATUSES, formatDate, formatINR, orderStatusMeta, useLatestRequest,
} from '../../components/admin/adminUtils';

function StatCard({ label, value, sub, accent, to }) {
  const body = (
    <>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ? 'text-primary-dark' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </>
  );
  const cls = `block bg-white rounded-xl border ${accent ? 'border-primary/20' : 'border-gray-200'} p-5 shadow-sm`;
  return to ? (
    <Link to={to} className={`${cls} hover:border-primary/40 hover:shadow transition`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const beginRequest = useLatestRequest();

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/stats');
      if (isCurrent()) setStats(res.data);
    } catch (err) {
      // A 401 is handled by apiClient (redirect to login)
      if (isCurrent()) setError(getErrorMessage(err, 'Could not load dashboard statistics.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [beginRequest]);

  useEffect(() => { load(); }, [load]);

  if (loading && !stats) {
    return (
      <div className="space-y-4 animate-pulse" role="status" aria-label="Loading dashboard">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Page title="Dashboard">
        <Card>
          <ErrorState message={error || 'Could not load dashboard statistics.'} onRetry={load} />
        </Card>
      </Page>
    );
  }

  const orders = stats.orders ?? {};
  const products = stats.products ?? {};
  const categories = stats.categories ?? {};
  const consultations = stats.consultations ?? {};
  const reviews = stats.reviews ?? {};
  const recentOrders = stats.recent_orders ?? [];

  return (
    <Page
      title="Dashboard"
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    >
      {error && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Orders"
          value={orders.total ?? 0}
          sub={`${orders.by_status?.pending ?? 0} pending · excludes unpaid checkouts`}
          to="/admin/orders"
        />
        <StatCard
          label="Revenue (This Month)"
          value={formatINR(orders.revenue_this_month ?? 0)}
          sub={`Today: ${formatINR(orders.revenue_today ?? 0)} · All time: ${formatINR(orders.revenue_all_time ?? 0)}`}
          accent
        />
        <StatCard
          label="New Consultations"
          value={consultations.new ?? 0}
          sub={`${consultations.total ?? 0} requests in total`}
          accent={(consultations.new ?? 0) > 0}
          to="/admin/consultations?status=new"
        />
        <StatCard
          label="Reviews Awaiting Approval"
          value={reviews.pending ?? 0}
          sub="Pending reviews are hidden from the store"
          accent={(reviews.pending ?? 0) > 0}
          to="/admin/reviews"
        />
        <StatCard
          label="Products"
          value={products.total ?? 0}
          sub={`${categories.total ?? 0} categories`}
          to="/admin/products"
        />
        <StatCard
          label="Low Stock"
          value={products.low_stock_count ?? 0}
          sub="published products with ≤ 5 units"
          accent={(products.low_stock_count ?? 0) > 0}
        />
      </div>

      {/* Orders by status */}
      <Card title="Orders by Status">
        <div className="flex flex-wrap gap-2">
          {ORDER_FILTER_STATUSES.map((s) => {
            const meta = orderStatusMeta(s);
            return (
              <Link
                key={s}
                to={`/admin/orders?status=${s}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold hover:ring-2 hover:ring-primary/20 ${meta.className}`}
              >
                <span>{meta.label}</span>
                <span className="font-bold">{orders.by_status?.[s] ?? 0}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Low stock alert */}
      {products.low_stock?.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-orange-800">Low Stock Alert</h2>
          <div className="space-y-2">
            {products.low_stock.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <Link to={`/admin/products/${p.id}/edit`} className="text-gray-900 font-medium hover:underline truncate">
                  {p.name}
                </Link>
                <span className={`shrink-0 font-bold px-2 py-0.5 rounded-full text-xs ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                </span>
              </div>
            ))}
          </div>
          <Link to="/admin/products" className="inline-block text-xs font-semibold text-primary hover:underline">
            Manage products →
          </Link>
        </div>
      )}

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <Card
          title="Recent Orders"
          actions={
            <Link to="/admin/orders" className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          }
        >
          <div className="-mx-4 sm:-mx-5 -my-4 sm:-my-5 divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const meta = orderStatusMeta(order.status);
              return (
                <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-gray-800">#{order.id}</span>
                    <span className="text-sm text-gray-600 truncate">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill className={meta.className}>{meta.label}</Pill>
                    <span className="text-sm font-semibold text-gray-800">{formatINR(order.total_amount)}</span>
                    <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(orders.total ?? 0) === 0 && (products.total ?? 0) === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-gray-700">Your store is set up and ready!</p>
          <p className="text-xs text-gray-500">Start by adding categories and products, then share your store link.</p>
          <div className="flex justify-center gap-3 mt-3">
            <Button size="sm" to="/admin/categories/add">Add Category</Button>
            <Button size="sm" variant="outline" to="/admin/products/add">Add Product</Button>
          </div>
        </div>
      )}
    </Page>
  );
}
