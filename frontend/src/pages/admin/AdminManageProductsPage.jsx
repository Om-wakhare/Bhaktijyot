import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import {
  Alert, Button, Card, EmptyState, ErrorState, FileInput, Input, LoadingState, Page, Pill, Select, cn,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import {
  flattenTree, formatINR, httpStatus, indentLabel, subtreeIds, useLatestRequest,
} from '../../components/admin/adminUtils';

const MAX_BULK_BYTES = 5 * 1024 * 1024;

function StockBadge({ stock }) {
  if (stock === -1) return <Pill className="bg-gray-100 text-gray-500">Unlimited</Pill>;
  if (stock === 0) return <Pill className="bg-red-100 text-red-700">Out of Stock</Pill>;
  if (stock <= 5) return <Pill className="bg-amber-100 text-amber-800">Low: {stock}</Pill>;
  return <Pill className="bg-emerald-100 text-emerald-800">In Stock: {stock}</Pill>;
}

function StatusDot({ active }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full shrink-0', active ? 'bg-primary' : 'bg-gray-300')} />
      <span className={cn('text-[11px] font-semibold', active ? 'text-primary' : 'text-gray-400')}>
        {active ? 'Published' : 'Draft'}
      </span>
    </span>
  );
}

function SortHeader({ col, label, sort, onSort }) {
  const active = sort.col === col;
  return (
    <th
      className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 uppercase hover:text-gray-900">
        {label}
        <span aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

const TH = 'px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500';
const TD = 'px-3.5 py-2.5 align-middle';

export function AdminManageProductsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const beginRequest = useLatestRequest();

  const [products, setProducts] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState({ col: 'name', dir: 'asc' });

  // Bulk upload
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkInputKey, setBulkInputKey] = useState(0);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/products', { params: { include_inactive: true } }),
        api.get('/categories'),
      ]);
      if (!isCurrent()) return;
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setCategoryTree(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Could not load products.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [beginRequest]);

  useEffect(() => { load(); }, [load]);

  const refreshProducts = async () => {
    try {
      const res = await api.get('/products', { params: { include_inactive: true } });
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not refresh the product list.'));
    }
  };

  // ── Bulk upload ──────────────────────────────────────────
  const openBulk = () => {
    setBulkOpen(true);
    setBulkFile(null);
    setBulkResult(null);
    setBulkError('');
    setBulkInputKey((k) => k + 1);
  };
  const closeBulk = () => { if (!bulkUploading) setBulkOpen(false); };

  useEffect(() => {
    if (!bulkOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !bulkUploading) setBulkOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [bulkOpen, bulkUploading]);

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/products/bulk-template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_bulk_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not download the template.'));
    }
  };

  const onBulkFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setBulkResult(null);
    setBulkError('');
    if (file && !/\.(xlsx|xlsm)$/i.test(file.name)) {
      setBulkError('Please choose a .xlsx Excel file.');
      setBulkFile(null);
      return;
    }
    if (file && file.size > MAX_BULK_BYTES) {
      setBulkError('The Excel file is too large (max 5 MB).');
      setBulkFile(null);
      return;
    }
    setBulkFile(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile || bulkUploading) return;
    setBulkUploading(true);
    setBulkResult(null);
    setBulkError('');
    try {
      const fd = new FormData();
      fd.append('file', bulkFile);
      const res = await api.post('/products/bulk-upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkResult(res.data);
      // The file has been processed — clear it so the same sheet can't be imported twice
      setBulkFile(null);
      setBulkInputKey((k) => k + 1);
      const created = res.data?.created ?? 0;
      if (created > 0) {
        toast.success(`${created} product${created !== 1 ? 's' : ''} imported`);
        await refreshProducts();
      }
    } catch (err) {
      setBulkError(getErrorMessage(err, 'Upload failed.'));
    } finally {
      setBulkUploading(false);
    }
  };

  // ── Delete / unpublish ───────────────────────────────────
  const unpublish = async (product) => {
    setBusyId(product.id);
    try {
      const res = await api.put(`/products/${product.id}`, { is_active: false });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...res.data } : p)));
      toast.success(`"${product.name}" is now a draft (hidden from the store)`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not unpublish the product.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product) => {
    const ok = await confirm({
      title: `Delete "${product.name}"?`,
      message: 'This permanently removes the product, its images and reviews. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(product.id);
    try {
      await api.delete(`/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success('Product deleted');
    } catch (err) {
      if (httpStatus(err) === 409) {
        setBusyId(null);
        const alreadyDraft = product.is_active === false;
        const unpub = await confirm({
          title: 'This product can’t be deleted',
          message: getErrorMessage(err),
          confirmLabel: alreadyDraft ? 'OK' : 'Unpublish instead',
          cancelLabel: alreadyDraft ? null : 'Keep as is',
        });
        if (unpub && !alreadyDraft) await unpublish(product);
        return;
      }
      toast.error(getErrorMessage(err, 'Delete failed.'));
    } finally {
      setBusyId(null);
    }
  };

  // ── Filtering & sorting ──────────────────────────────────
  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  const toggleSort = (col) => {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name ?? '').toLowerCase().includes(q) ||
          (p.badge ?? '').toLowerCase().includes(q) ||
          (p.slug ?? '').toLowerCase().includes(q),
      );
    }
    if (catFilter) {
      // The selected category and all of its subcategories
      const ids = subtreeIds(categoryTree, Number(catFilter));
      list = list.filter((p) => ids.has(p.category_id ?? p.category?.id));
    }
    if (statusFilter === 'published') list = list.filter((p) => p.is_active !== false);
    if (statusFilter === 'draft') list = list.filter((p) => p.is_active === false);

    const val = (p) => {
      if (sort.col === 'price') return p.price ?? 0;
      if (sort.col === 'stock') return p.stock ?? -1;
      return (p.name ?? '').toLowerCase();
    };
    list.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, categoryTree, search, catFilter, statusFilter, sort]);

  const hasFilters = Boolean(search || catFilter || statusFilter);
  const createdCount = bulkResult?.created ?? 0;

  return (
    <Page
      title="Products"
      description={
        loadError && !products.length
          ? undefined
          : `${products.length} total · ${products.filter((p) => p.is_active !== false).length} published`
      }
      actions={
        <>
          <Button size="sm" variant="outline" onClick={openBulk}>Bulk Upload</Button>
          <Button size="sm" to="/admin/products/add">+ Add Product</Button>
        </>
      }
    >
      <Card>
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, slug or badge…"
            aria-label="Search products"
            className="sm:max-w-[240px]"
          />
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            aria-label="Filter by category"
            className="sm:max-w-[220px]"
          >
            <option value="">All categories</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={String(c.id)}>{indentLabel(c.level, c.name)}</option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="sm:max-w-[150px]"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
          {hasFilters && (
            <Button
              variant="outline" size="sm"
              onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); }}
            >
              Clear
            </Button>
          )}
          {!loading && !loadError && (
            <span className="ml-auto text-xs text-gray-400">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <LoadingState label="Loading products…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState>
            No products yet.{' '}
            <Link to="/admin/products/add" className="font-semibold text-primary hover:underline">Add your first product</Link>
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>No products match these filters.</EmptyState>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={TH}>Image</th>
                  <SortHeader col="name" label="Name" sort={sort} onSort={toggleSort} />
                  <th className={TH}>Category</th>
                  <SortHeader col="price" label="Price" sort={sort} onSort={toggleSort} />
                  <SortHeader col="stock" label="Stock" sort={sort} onSort={toggleSort} />
                  <th className={TH}>Status</th>
                  <th className={TH}>Badge</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p.id} className={cn('border-t border-gray-100', idx % 2 ? 'bg-gray-50/60' : 'bg-white')}>
                    <td className={TD}>
                      {p.image_path ? (
                        <img src={mediaUrl(p.image_path)} alt="" className="h-[38px] w-[38px] rounded-md object-cover" />
                      ) : (
                        <div className="h-[38px] w-[38px] rounded-md bg-gray-100 flex items-center justify-center text-lg text-gray-300" aria-hidden="true">
                          ◈
                        </div>
                      )}
                    </td>

                    <td className={TD}>
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="block max-w-[220px] truncate font-semibold text-gray-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="text-[11px] text-gray-400">#{p.id} · {p.slug}</span>
                    </td>

                    <td className={TD}>
                      <span className="text-xs text-gray-500">{p.category?.name ?? '—'}</span>
                    </td>

                    <td className={TD}>
                      {p.price != null ? (
                        <>
                          <span className="font-semibold text-gray-800">{formatINR(p.price)}</span>
                          {p.mrp != null && p.mrp > p.price && (
                            <div className="text-[11px] text-gray-400 line-through">{formatINR(p.mrp)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    <td className={TD}><StockBadge stock={p.stock} /></td>
                    <td className={TD}><StatusDot active={p.is_active !== false} /></td>

                    <td className={TD}>
                      {p.badge ? (
                        <Pill className="bg-red-900/8 text-red-900">{p.badge}</Pill>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" to={`/admin/products/${p.id}/edit`}>Edit</Button>
                        <Button
                          variant="danger" size="sm"
                          onClick={() => handleDelete(p)}
                          disabled={busyId === p.id}
                        >
                          {busyId === p.id ? '…' : 'Delete'}
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

      {/* ── Bulk Upload Modal ── */}
      {bulkOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/60 backdrop-blur-[3px]" aria-hidden="true" onClick={closeBulk} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-upload-title"
            className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 id="bulk-upload-title" className="text-lg font-bold text-gray-900">Bulk Upload Products</h3>
            <p className="text-sm text-gray-500 mt-1">
              Upload an Excel (.xlsx) file to create many products at once (max 5 MB, 2000 rows).
            </p>

            {/* Step 1 — template */}
            <div className="mt-5 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-1">1. Download the template</p>
              <p className="text-[11px] text-gray-500 mb-2">
                Columns: name (required), slug, description, benefits, price, mrp, badge, category, stock.
                Leave <b>slug</b> blank to auto-generate. <b>category</b> matches an existing category name.
              </p>
              <Button size="sm" variant="outline" onClick={downloadTemplate}>Download Excel Template</Button>
            </div>

            {/* Step 2 — file */}
            <div className="mt-4">
              <label htmlFor="bulk-file" className="block text-xs font-semibold text-gray-700 mb-2">
                2. Choose your filled .xlsx file
              </label>
              <FileInput
                key={bulkInputKey}
                id="bulk-file"
                accept=".xlsx,.xlsm"
                onChange={onBulkFileChange}
                disabled={bulkUploading}
              />
            </div>

            {bulkError && <Alert tone="error" className="mt-4">{bulkError}</Alert>}

            {/* Result */}
            {bulkResult && (
              <Alert
                tone={createdCount > 0 ? 'success' : 'warning'}
                className="mt-4"
                title={
                  createdCount > 0
                    ? `✓ ${createdCount} created · ${bulkResult.skipped ?? 0} skipped`
                    : `No products were created · ${bulkResult.skipped ?? 0} skipped`
                }
              >
                {bulkResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-red-700 mb-1">Skipped rows:</p>
                    <ul className="text-[11px] text-red-600 space-y-0.5">
                      {bulkResult.errors.map((er, i) => (
                        <li key={i}>Row {er.row}: {er.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-gray-600">
                  To import more, fix the sheet and choose it again.
                </p>
              </Alert>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeBulk} disabled={bulkUploading}>
                {bulkResult ? 'Done' : 'Cancel'}
              </Button>
              <Button size="sm" onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading}>
                {bulkUploading ? 'Uploading…' : 'Upload & Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
