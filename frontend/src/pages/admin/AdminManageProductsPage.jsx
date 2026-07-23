import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { Button, Card, Input, Page, Select } from '../../components/admin/ui';

function StockBadge({ stock }) {
  if (stock === -1)  return <Chip bg="#F3F4F6" color="#6B7280">Unlimited</Chip>;
  if (stock === 0)   return <Chip bg="#FEE2E2" color="#B91C1C">Out of Stock</Chip>;
  if (stock <= 5)    return <Chip bg="#FEF3C7" color="#92400E">Low: {stock}</Chip>;
  return                    <Chip bg="#D1FAE5" color="#065F46">In Stock: {stock}</Chip>;
}

function StatusDot({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? '#1D3D2C' : '#D1D5DB', flexShrink: 0,
      }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#1D3D2C' : '#9CA3AF' }}>
        {active ? 'Published' : 'Draft'}
      </span>
    </span>
  );
}

function Chip({ bg, color, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, background: bg, color,
    }}>
      {children}
    </span>
  );
}

function th(sortable = false) {
  return {
    padding: '10px 14px', fontWeight: 600, fontSize: 11,
    textAlign: 'left', color: '#6B7280',
    letterSpacing: '0.04em', textTransform: 'uppercase',
    cursor: sortable ? 'pointer' : 'default',
    userSelect: sortable ? 'none' : undefined,
  };
}
function td() { return { padding: '10px 14px', verticalAlign: 'middle' }; }

export function AdminManageProductsPage() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  const [search, setSearch]           = useState('');
  const [catFilter, setCatFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort]               = useState({ col: 'name', dir: 'asc' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      api.get('/products', { params: { include_inactive: true } }),
      api.get('/categories/flat'),
    ]).then(([pRes, cRes]) => {
      setProducts(pRes.data);
      setCategories(cRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast('Product deleted');
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const toggleSort = (col) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  };

  const sortIcon = (col) => {
    if (sort.col !== col) return ' ↕';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.badge ?? '').toLowerCase().includes(q)
      );
    }
    if (catFilter) {
      list = list.filter(
        (p) => String(p.category_id) === catFilter || String(p.category?.id) === catFilter
      );
    }
    if (statusFilter === 'published') list = list.filter((p) => p.is_active);
    if (statusFilter === 'draft')     list = list.filter((p) => !p.is_active);

    list.sort((a, b) => {
      let va, vb;
      if (sort.col === 'name')  { va = a.name ?? '';  vb = b.name ?? ''; }
      if (sort.col === 'price') { va = a.price ?? 0;  vb = b.price ?? 0; }
      if (sort.col === 'stock') { va = a.stock ?? -1; vb = b.stock ?? -1; }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [products, search, catFilter, statusFilter, sort]);

  return (
    <Page
      title="Products"
      description={`${products.length} total · ${products.filter((p) => p.is_active).length} published`}
      actions={
        <Link to="/admin/products/add">
          <Button size="sm">+ Add Product</Button>
        </Link>
      }
    >
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '10px 18px', borderRadius: '8px',
          background: toast.type === 'error' ? '#8B1A1A' : '#1D3D2C',
          color: '#F4E4D1', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      <Card>
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or badge…"
            style={{ maxWidth: 240 }}
          />
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: 150 }}
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
          {(search || catFilter || statusFilter) && (
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); }}
            >
              Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No products match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                <tr>
                  <th style={th()}>Image</th>
                  <th style={th(true)} onClick={() => toggleSort('name')}>Name{sortIcon('name')}</th>
                  <th style={th()}>Category</th>
                  <th style={th(true)} onClick={() => toggleSort('price')}>Price{sortIcon('price')}</th>
                  <th style={th(true)} onClick={() => toggleSort('stock')}>Stock{sortIcon('stock')}</th>
                  <th style={th()}>Status</th>
                  <th style={th()}>Badge</th>
                  <th style={th()}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{
                      borderTop: '1px solid #F3F4F6',
                      background: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                    }}
                  >
                    <td style={td()}>
                      {p.image_path ? (
                        <img
                          src={mediaUrl(p.image_path)}
                          alt=""
                          style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6 }}
                        />
                      ) : (
                        <div style={{
                          width: 38, height: 38, borderRadius: 6, background: '#F3F4F6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, color: '#D1D5DB',
                        }}>◈</div>
                      )}
                    </td>

                    <td style={td()}>
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="font-semibold text-gray-900 hover:underline"
                        style={{
                          display: 'block', maxWidth: 220,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {p.name}
                      </Link>
                      <span className="text-[11px] text-gray-400">#{p.id} · {p.slug}</span>
                    </td>

                    <td style={td()}>
                      <span className="text-xs text-gray-500">{p.category?.name ?? '—'}</span>
                    </td>

                    <td style={td()}>
                      {p.price != null ? (
                        <>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(p.price).toLocaleString('en-IN')}
                          </span>
                          {p.mrp != null && p.mrp > p.price && (
                            <div className="text-[11px] text-gray-400 line-through">
                              ₹{Number(p.mrp).toLocaleString('en-IN')}
                            </div>
                          )}
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    <td style={td()}>
                      <StockBadge stock={p.stock} />
                    </td>

                    <td style={td()}>
                      <StatusDot active={p.is_active ?? true} />
                    </td>

                    <td style={td()}>
                      {p.badge
                        ? <Chip bg="rgba(139,26,26,0.08)" color="#8B1A1A">{p.badge}</Chip>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>

                    <td style={td()}>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/products/${p.id}/edit`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                        <Button
                          variant="danger" size="sm"
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
