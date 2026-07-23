import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

const ALL_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-xl border ${accent ? 'border-primary/20' : 'border-gray-200'} p-5 shadow-sm`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ? 'text-primary-dark' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-sm text-gray-500">
        Could not load statistics. Make sure the backend is running.
      </div>
    );
  }

  const { orders, products, categories, recent_orders } = stats;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={orders.total}
          sub={`${orders.by_status?.pending ?? 0} pending`}
        />
        <StatCard
          label="Revenue (This Month)"
          value={`₹ ${Number(orders.revenue_this_month).toLocaleString('en-IN')}`}
          sub={`All time: ₹ ${Number(orders.revenue_all_time).toLocaleString('en-IN')}`}
          accent
        />
        <StatCard
          label="Products"
          value={products.total}
          sub={`${categories.total} categories`}
        />
        <StatCard
          label="Low Stock"
          value={products.low_stock_count}
          sub="products with ≤ 5 units"
          accent={products.low_stock_count > 0}
        />
      </div>

      {/* Revenue today */}
      {orders.revenue_today > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <div className="text-sm font-semibold text-green-900">Today's Revenue</div>
            <div className="text-xl font-bold text-green-800">₹ {Number(orders.revenue_today).toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {/* Orders by status */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Orders by Status</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            <Link
              key={s}
              to={`/admin/orders`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-700'}`}
            >
              <span className="capitalize">{s}</span>
              <span className="font-bold">{orders.by_status?.[s] ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Low stock alert */}
      {products.low_stock?.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <span>⚠️</span> Low Stock Alert
          </h2>
          <div className="space-y-2">
            {products.low_stock.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-900 font-medium">{p.name}</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                </span>
              </div>
            ))}
          </div>
          <Link to="/admin/products" className="text-xs font-semibold text-primary hover:underline">
            Manage products →
          </Link>
        </div>
      )}

      {/* Recent orders */}
      {recent_orders?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recent_orders.map((order) => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800">#{order.id}</span>
                  <span className="text-sm text-gray-600">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    ₹ {Number(order.total_amount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.total === 0 && products.total === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-2">
          <div className="text-3xl">🚀</div>
          <p className="text-sm font-semibold text-gray-700">Your store is set up and ready!</p>
          <p className="text-xs text-gray-500">Start by adding categories and products, then share your store link.</p>
          <div className="flex justify-center gap-3 mt-3">
            <Link to="/admin/categories/add" className="px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark">
              Add Category
            </Link>
            <Link to="/admin/products/add" className="px-4 py-2 rounded-full border border-primary text-primary text-xs font-semibold hover:bg-primary/5">
              Add Product
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
