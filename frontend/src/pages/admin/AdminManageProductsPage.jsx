import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert, Button, Card, EmptyState, ErrorState, FileInput, Input, LoadingState, Page, Pill, Select, cn,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import {
  flattenTree, formatINR, httpStatus, indentLabel, subtreeIds, useLatestRequest,
} from '../../components/admin/adminUtils';

const MAX_BULK_BYTES = 5 * 1024 * 1024;

/** Stock -1 means "unlimited / not tracked" in the backend — never show it as a number. */
function StockBadge({ stock }) {
  if (stock === -1 || stock === null || stock === undefined) {
    return <Pill className="bg-espresso/5 text-espresso/75" title="Stock is not tracked for this product">Unlimited</Pill>;
  }
  if (stock === 0) return <Pill className="bg-red-100 text-red-800">Out of stock</Pill>;
  if (stock <= 5) return <Pill className="bg-gold-100 text-gold-800">Low: {stock} left</Pill>;
  return <Pill className="bg-primary-50 text-primary-dark">{stock} in stock</Pill>;
}

/** Sort value: untracked (unlimited) stock sorts after every real count. */
function stockSortValue(stock) {
  return stock === -1 || stock === null || stock === undefined ? Number.POSITIVE_INFINITY : stock;
}

function StatusDot({ active }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full shrink-0', active ? 'bg-primary' : 'bg-espresso/30')} />
      <span className={cn('text-[11px] font-semibold', active ? 'text-primary' : 'text-espresso/60')}>
        {active ? 'Published' : 'Draft'}
      </span>
    </span>
  );
}

function SortHeader({ col, label, sort, onSort }) {
  const active = sort.col === col;
  return (
    <th
      className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-espresso/60"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 uppercase hover:text-espresso">
        {label}
        <span aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

const TH = 'px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-espresso/60';
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
  // Never close mid-upload (the result would be lost and the sheet could be sent again)
  const closeBulk = () => { if (!bulkUploading) setBulkOpen(false); };

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
      if (sort.col === 'stock') return stockSortValue(p.stock);
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
            <span className="ml-auto text-xs text-espresso/60">
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
          <>
          {/* Phones: one card per product */}
          <ul className="sm:hidden -mx-4 divide-y divide-espresso/8 border-y border-espresso/8">
            {filtered.map((p) => (
              <li key={p.id} className="flex gap-3 px-4 py-3">
                {p.image_path ? (
                  <img src={mediaUrl(p.image_path)} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-md bg-ivory flex items-center justify-center text-lg text-espresso/40" aria-hidden="true">
                    ◈
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <Link to={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-semibold text-espresso hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-[11px] text-espresso/60 truncate">
                    #{p.id} · {p.category?.name ?? 'No category'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-espresso">{p.price != null ? formatINR(p.price) : '—'}</span>
                    <StockBadge stock={p.stock} />
                    <StatusDot active={p.is_active !== false} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" to={`/admin/products/${p.id}/edit`}>Edit</Button>
                    <Button
                      variant="danger" size="sm"
                      onClick={() => handleDelete(p)}
                      disabled={busyId === p.id}
                      aria-label={`Delete ${p.name}`}
                    >
                      {busyId === p.id ? '…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablets and computers: sortable table */}
          <div className="hidden sm:block overflow-x-auto -mx-4 sm:-mx-5">
            <table className="min-w-full text-sm">
              <thead className="bg-ivory border-b border-espresso/8">
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
                  <tr key={p.id} className={cn('border-t border-espresso/8', idx % 2 ? 'bg-ivory/60' : 'bg-white')}>
                    <td className={TD}>
                      {p.image_path ? (
                        <img src={mediaUrl(p.image_path)} alt="" className="h-[38px] w-[38px] rounded-md object-cover" />
                      ) : (
                        <div className="h-[38px] w-[38px] rounded-md bg-espresso/5 flex items-center justify-center text-lg text-espresso/45" aria-hidden="true">
                          ◈
                        </div>
                      )}
                    </td>

                    <td className={TD}>
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="block max-w-[220px] truncate font-semibold text-espresso hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="text-[11px] text-espresso/60">#{p.id} · {p.slug}</span>
                    </td>

                    <td className={TD}>
                      <span className="text-xs text-espresso/60">{p.category?.name ?? '—'}</span>
                    </td>

                    <td className={TD}>
                      {p.price != null ? (
                        <>
                          <span className="font-semibold text-espresso">{formatINR(p.price)}</span>
                          {p.mrp != null && p.mrp > p.price && (
                            <div className="text-[11px] text-espresso/60 line-through">{formatINR(p.mrp)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-espresso/45">—</span>
                      )}
                    </td>

                    <td className={TD}><StockBadge stock={p.stock} /></td>
                    <td className={TD}><StatusDot active={p.is_active !== false} /></td>

                    <td className={TD}>
                      {p.badge ? (
                        <Pill className="bg-gold-100 text-gold-800">{p.badge}</Pill>
                      ) : (
                        <span className="text-espresso/45 text-xs">—</span>
                      )}
                    </td>

                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" to={`/admin/products/${p.id}/edit`}>Edit</Button>
                        <Button
                          variant="danger" size="sm"
                          onClick={() => handleDelete(p)}
                          disabled={busyId === p.id}
                          aria-label={`Delete ${p.name}`}
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
          </>
        )}
      </Card>

      {/* ── Bulk Upload dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={(open) => { if (!open) closeBulk(); }}>
        <DialogContent
          hideClose={bulkUploading}
          onInteractOutside={(e) => { if (bulkUploading) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (bulkUploading) e.preventDefault(); }}
          className="w-[calc(100%-2rem)] max-w-[520px] max-h-[90vh] overflow-y-auto gap-0 rounded-2xl border-espresso/10 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        >
          <DialogHeader className="space-y-0 pr-6 text-left">
            <DialogTitle className="text-lg font-bold text-espresso">Bulk Upload Products</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-espresso/70">
              Upload an Excel (.xlsx) file to create many products at once (max 5 MB, 2000 rows).
            </DialogDescription>
          </DialogHeader>

          {/* Step 1 — template */}
          <div className="mt-5 p-3 rounded-lg bg-ivory border border-espresso/8">
            <p className="text-xs font-semibold text-espresso/80 mb-1">1. Download the template</p>
            <p className="text-[11px] text-espresso/70 mb-2">
              Columns: name (required), slug, description, benefits, price, mrp, badge, category, stock.
              Leave <b>slug</b> blank to auto-generate. <b>category</b> matches an existing category name.
              Leave <b>stock</b> blank for unlimited (not tracked).
            </p>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>Download Excel Template</Button>
          </div>

          {/* Step 2 — file */}
          <div className="mt-4">
            <label htmlFor="bulk-file" className="block text-xs font-semibold text-espresso/80 mb-2">
              2. Choose your filled .xlsx file
            </label>
            <FileInput
              key={bulkInputKey}
              id="bulk-file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                  ? `${createdCount} created · ${bulkResult.skipped ?? 0} skipped`
                  : `No products were created · ${bulkResult.skipped ?? 0} skipped`
              }
            >
              {bulkResult.errors?.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-800 mb-1">Skipped rows:</p>
                  <ul className="text-[11px] text-red-800 space-y-0.5">
                    {bulkResult.errors.map((er, i) => (
                      <li key={i}>Row {er.row}: {er.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-2 text-[11px] text-espresso/70">
                {createdCount > 0
                  ? 'This file has been imported. To add the skipped rows, fix only those rows in a new sheet and upload it — uploading the same file again would create duplicates.'
                  : 'Fix the sheet and choose it again.'}
              </p>
            </Alert>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" size="sm" onClick={closeBulk} disabled={bulkUploading}>
              {bulkResult ? 'Done' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading}>
              {bulkUploading ? 'Uploading…' : 'Upload & Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
