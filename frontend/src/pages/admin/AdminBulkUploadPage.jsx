import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Box, CheckCircle2, Download, FileSpreadsheet, FolderOpen, ImagePlus,
  Loader2, RotateCcw, Star, X,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { Alert, Button, Card, Page, Pill, Select, cn } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { formatINR } from '../../components/admin/adminUtils';
import {
  MAX_PHOTOS_PER_PRODUCT, folderOf, matchNewPhotos, matchPhotos,
} from '../../components/admin/bulk/photoMatch';
import {
  PHOTO_ACCEPT, compressImage, isAcceptedPhoto, isHeic, makeThumbnail,
} from '../../components/admin/bulk/compressImage';
import { MODEL_LABELS, resolveModel } from '../../components/product3d/modelSpec';

const MAX_EXCEL_BYTES = 5 * 1024 * 1024;
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };
const UPLOAD_WORKERS = 2;

/* Files dropped from the desktop, including whole folders (keeps the folder name). */
async function filesFromDrop(dataTransfer) {
  const items = Array.from(dataTransfer.items || []);
  const entries = items.map((it) => it.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return Array.from(dataTransfer.files || []).map((file) => ({ file, relPath: '' }));
  const out = [];
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      out.push({ file, relPath: `${prefix}${file.name}` });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch;
      do {
        // eslint-disable-next-line no-await-in-loop
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        // eslint-disable-next-line no-await-in-loop
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      } while (batch.length);
    }
  };
  for (const entry of entries) await walk(entry, ''); // eslint-disable-line no-await-in-loop
  return out;
}

const fileId = (f) => `${f.name}|${f.size}|${f.lastModified}`;

function StepTitle({ n, children, done }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          done ? 'bg-primary text-white' : 'bg-gold-100 text-gold-800',
        )}
        aria-hidden="true"
      >
        {done ? '✓' : n}
      </span>
      {children}
    </span>
  );
}

export function AdminBulkUploadPage() {
  const toast = useToast();
  const excelInput = useRef(null);
  const photoInput = useRef(null);
  const folderInput = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [preview, setPreview] = useState(null); // dry-run result

  const [photos, setPhotos] = useState([]); // { id, file, name, folder, thumb }
  const [skippedFiles, setSkippedFiles] = useState([]);
  const [match, setMatch] = useState({ assign: {}, unmatched: [] });
  const [dragging, setDragging] = useState(false);

  const [phase, setPhase] = useState('edit'); // edit | creating | uploading | done
  const [created, setCreated] = useState([]); // created_items
  const [progress, setProgress] = useState({}); // row -> { state, error, mediaDone }
  const [createError, setCreateError] = useState('');

  const okRows = useMemo(() => (preview?.rows || []).filter((r) => !r.error), [preview]);
  const badRows = useMemo(() => (preview?.rows || []).filter((r) => r.error), [preview]);
  const photoById = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos]);
  const thumbsRef = useRef([]);

  // Free preview images when leaving the page
  useEffect(() => () => thumbsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // Warn before closing the tab while products are being created
  useEffect(() => {
    if (phase !== 'creating' && phase !== 'uploading') return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase]);

  // ── Step 1: template ───────────────────────────────────────
  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/products/bulk-template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bhaktijyot_products_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not download the template.'));
    } finally {
      setDownloading(false);
    }
  };

  // ── Step 2: Excel → dry run ────────────────────────────────
  const checkExcel = async (file) => {
    setExcelError('');
    setPreview(null);
    if (!file) return;
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      setExcelError('Please choose an Excel file (.xlsx). If you use Google Sheets: File → Download → Microsoft Excel.');
      return;
    }
    if (file.size > MAX_EXCEL_BYTES) {
      setExcelError('The Excel file is too large (max 5 MB).');
      return;
    }
    setExcelFile(file);
    setChecking(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/products/bulk-upload', fd, { ...MULTIPART, params: { dry_run: true } });
      setPreview(res.data);
      const rows = (res.data.rows || []).filter((r) => !r.error);
      setMatch(matchPhotos(rows, photos));
      if (!rows.length) setExcelError('No products could be read from this sheet. See the problems listed below.');
    } catch (err) {
      setExcelError(getErrorMessage(err, 'Could not read the Excel file.'));
    } finally {
      setChecking(false);
    }
  };

  // ── Step 3: photos ─────────────────────────────────────────
  const addPhotos = useCallback(async (entries) => {
    const known = new Set(photos.map((p) => p.id));
    const skipped = [];
    const fresh = [];
    entries.forEach(({ file, relPath }) => {
      if (isHeic(file)) { skipped.push(`${file.name} (iPhone HEIC: set Camera → Formats → Most Compatible, or export as JPEG)`); return; }
      if (!isAcceptedPhoto(file)) { if (!/^\./.test(file.name)) skipped.push(`${file.name} (not a JPG, PNG or WebP photo)`); return; }
      const id = fileId(file);
      if (known.has(id)) return;
      known.add(id);
      fresh.push({ id, file, name: file.name, folder: folderOf(file, relPath), thumb: null });
    });
    setSkippedFiles((prev) => [...prev, ...skipped]);
    if (!fresh.length) return;
    setPhotos((prev) => [...prev, ...fresh]);
    setMatch((cur) => matchNewPhotos(okRows, fresh, cur));
    // Thumbnails load in the background, a few at a time
    for (const p of fresh) {
      // eslint-disable-next-line no-await-in-loop
      const thumb = await makeThumbnail(p.file);
      thumbsRef.current.push(thumb);
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, thumb } : x)));
    }
  }, [photos, okRows]);

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    addPhotos(files.map((file) => ({ file, relPath: file.webkitRelativePath || '' })));
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    if (phase !== 'edit') return;
    addPhotos(await filesFromDrop(e.dataTransfer));
  };

  const assignPhoto = (photoId, row) => {
    setMatch((cur) => {
      const assign = Object.fromEntries(Object.entries(cur.assign).map(([r, ids]) => [r, ids.filter((x) => x !== photoId)]));
      let unmatched = cur.unmatched.filter((x) => x !== photoId);
      if (row === '') unmatched = [...unmatched, photoId];
      else assign[row] = [...(assign[row] || []), photoId];
      return { assign, unmatched };
    });
  };

  const makeMain = (row, photoId) => {
    setMatch((cur) => ({
      ...cur,
      assign: { ...cur.assign, [row]: [photoId, ...(cur.assign[row] || []).filter((x) => x !== photoId)] },
    }));
  };

  // ── Step 4: create products, then upload photos ────────────
  const rowsWithPhotos = okRows.filter((r) => (match.assign[r.row] || []).length > 0);
  const overLimit = okRows.filter((r) => (match.assign[r.row] || []).length > MAX_PHOTOS_PER_PRODUCT);

  const uploadOne = async (item) => {
    const ids = (match.assign[item.row] || []).slice(0, MAX_PHOTOS_PER_PRODUCT);
    setProgress((p) => ({ ...p, [item.row]: { ...p[item.row], state: 'uploading', error: '' } }));
    try {
      let mediaDone = progress[item.row]?.mediaDone;
      if (ids.length && !mediaDone) {
        const fd = new FormData();
        for (const id of ids) {
          // eslint-disable-next-line no-await-in-loop
          const small = await compressImage(photoById[id].file);
          fd.append('images', small, small.name);
        }
        await api.post(`/products/${item.id}/media`, fd, MULTIPART);
        mediaDone = true;
        setProgress((p) => ({ ...p, [item.row]: { ...p[item.row], mediaDone: true } }));
      }
      if (item.publish_after_photos) await api.put(`/products/${item.id}`, { is_active: true });
      setProgress((p) => ({ ...p, [item.row]: { ...p[item.row], state: 'done', mediaDone } }));
    } catch (err) {
      setProgress((p) => ({
        ...p,
        [item.row]: { ...p[item.row], state: 'failed', error: getErrorMessage(err, 'Upload failed.') },
      }));
    }
  };

  const runUploads = async (items) => {
    const queue = [...items];
    const worker = async () => {
      while (queue.length) {
        // eslint-disable-next-line no-await-in-loop
        await uploadOne(queue.shift());
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_WORKERS, queue.length) }, worker));
  };

  const createAll = async () => {
    if (!excelFile || !okRows.length || phase !== 'edit') return;
    setPhase('creating');
    setCreateError('');
    try {
      const fd = new FormData();
      fd.append('file', excelFile);
      fd.append('hold_rows', JSON.stringify(rowsWithPhotos.map((r) => r.row)));
      const res = await api.post('/products/bulk-upload', fd, MULTIPART);
      const items = res.data.created_items || [];
      setCreated(items);
      const needsWork = items.filter((it) => (match.assign[it.row] || []).length > 0 || it.publish_after_photos);
      setProgress(Object.fromEntries(items.map((it) => [
        it.row, { state: needsWork.includes(it) ? 'waiting' : 'done', error: '', mediaDone: false },
      ])));
      setPhase('uploading');
      await runUploads(needsWork);
      setPhase('done');
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Could not create the products.'));
      setPhase('edit');
    }
  };

  const retry = async (item) => {
    setPhase('uploading');
    await uploadOne(item);
    setPhase('done');
  };

  const startOver = () => {
    thumbsRef.current.forEach((u) => URL.revokeObjectURL(u));
    thumbsRef.current = [];
    setExcelFile(null); setPreview(null); setExcelError('');
    setPhotos([]); setSkippedFiles([]); setMatch({ assign: {}, unmatched: [] });
    setCreated([]); setProgress({}); setCreateError(''); setPhase('edit');
  };

  const locked = phase !== 'edit';
  const doneCount = Object.values(progress).filter((p) => p.state === 'done').length;
  const failed = created.filter((it) => progress[it.row]?.state === 'failed');

  return (
    <Page
      title="Bulk upload"
      description="Add many products at once from an Excel sheet, with their photos."
      actions={<Button size="sm" variant="outline" to="/admin/products"><ArrowLeft className="h-4 w-4" /> Products</Button>}
    >
      {phase === 'edit' && (
        <>
          <Card title={<StepTitle n={1}>Get the Excel template</StepTitle>}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-espresso/75 max-w-2xl">
                One row per product. The template has dropdowns for category, status and 3D shape, and a
                “How to” sheet. Name photo files after the product (e.g. <em>Rose Quartz Bracelet 1.jpg</em>) and they
                are matched automatically.
              </p>
              <Button variant="outline" onClick={downloadTemplate} disabled={downloading} className="shrink-0">
                <Download className="h-4 w-4" /> {downloading ? 'Downloading…' : 'Download template'}
              </Button>
            </div>
          </Card>

          <Card title={<StepTitle n={2} done={okRows.length > 0}>Choose your filled Excel file</StepTitle>}>
            <input
              ref={excelInput}
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; checkExcel(f); }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => excelInput.current?.click()} disabled={checking}>
                <FileSpreadsheet className="h-4 w-4" /> {excelFile ? 'Choose a different file' : 'Choose Excel file'}
              </Button>
              {checking && (
                <span className="inline-flex items-center gap-2 text-sm text-espresso/70">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking the sheet…
                </span>
              )}
              {excelFile && !checking && preview && (
                <span className="text-sm text-espresso/75">
                  <strong>{excelFile.name}</strong>: {okRows.length} product{okRows.length === 1 ? '' : 's'} ready
                  {badRows.length > 0 && `, ${badRows.length} with problems`}
                </span>
              )}
            </div>
            {excelError && <Alert tone="error" className="mt-3">{excelError}</Alert>}
            {badRows.length > 0 && (
              <Alert tone="warning" className="mt-3" title="These rows will be skipped. Fix them in Excel and choose the file again:">
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  {badRows.slice(0, 20).map((r) => (
                    <li key={r.row}>Row {r.row}{r.name ? ` (${r.name})` : ''}: {r.error}</li>
                  ))}
                  {badRows.length > 20 && <li>…and {badRows.length - 20} more</li>}
                </ul>
              </Alert>
            )}
          </Card>

          {okRows.length > 0 && (
            <Card
              title={<StepTitle n={3} done={photos.length > 0}>Add the product photos</StepTitle>}
              subtitle={`Up to ${MAX_PHOTOS_PER_PRODUCT} per product; the first one is the main photo. Photos are shrunk before uploading, so it's quick even on mobile data.`}
            >
              <input ref={photoInput} type="file" multiple accept={PHOTO_ACCEPT} className="sr-only" onChange={onPickPhotos} />
              <input ref={folderInput} type="file" multiple webkitdirectory="" directory="" className="sr-only" onChange={onPickPhotos} />
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                  dragging ? 'border-primary bg-primary-50' : 'border-espresso/20 bg-ivory',
                )}
              >
                <ImagePlus className="h-8 w-8 text-espresso/50" aria-hidden="true" />
                <p className="text-sm text-espresso/80">
                  <span className="hidden sm:inline">Drag photos or folders here, or </span>choose them from your device.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => photoInput.current?.click()}><ImagePlus className="h-4 w-4" /> Choose photos</Button>
                  <Button variant="outline" onClick={() => folderInput.current?.click()} className="hidden sm:inline-flex">
                    <FolderOpen className="h-4 w-4" /> Choose a folder
                  </Button>
                </div>
                {photos.length > 0 && (
                  <p className="text-xs text-espresso/70">
                    {photos.length} photo{photos.length === 1 ? '' : 's'} added · {photos.length - match.unmatched.length} matched
                  </p>
                )}
              </div>
              {skippedFiles.length > 0 && (
                <Alert tone="warning" className="mt-3" title="Some files were not added:" onDismiss={() => setSkippedFiles([])}>
                  <ul className="mt-1 list-disc pl-5">{skippedFiles.slice(0, 8).map((s) => <li key={s}>{s}</li>)}</ul>
                </Alert>
              )}

              {match.unmatched.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-espresso">
                    Photos we couldn&apos;t match ({match.unmatched.length})
                  </h3>
                  <p className="text-xs text-espresso/70 mb-2">Pick the product for each one, or leave it out.</p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {match.unmatched.map((id) => {
                      const p = photoById[id];
                      if (!p) return null;
                      return (
                        <li key={id} className="rounded-lg border border-espresso/10 bg-white p-2">
                          <Thumb photo={p} />
                          <p className="mt-1 truncate text-[11px] text-espresso/70" title={p.name}>{p.name}</p>
                          <label className="sr-only" htmlFor={`assign-${id}`}>Product for {p.name}</label>
                          <Select id={`assign-${id}`} value="" onChange={(e) => assignPhoto(id, e.target.value)} className="mt-1 py-1.5 text-xs">
                            <option value="">Choose product…</option>
                            {okRows.map((r) => <option key={r.row} value={r.row}>{r.name}</option>)}
                          </Select>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {okRows.length > 0 && (
            <Card
              title={<StepTitle n={4}>Check and create</StepTitle>}
              subtitle="Nothing is saved until you press Create. Products with photos stay hidden until their photos finish uploading."
            >
              <ul className="divide-y divide-espresso/8">
                {okRows.map((r) => (
                  <ReviewRow
                    key={r.row}
                    row={r}
                    ids={match.assign[r.row] || []}
                    photoById={photoById}
                    onRemove={(id) => assignPhoto(id, '')}
                    onMain={(id) => makeMain(r.row, id)}
                  />
                ))}
              </ul>
              {overLimit.length > 0 && (
                <Alert tone="warning" className="mt-3">
                  {overLimit.length} product{overLimit.length === 1 ? ' has' : 's have'} more than {MAX_PHOTOS_PER_PRODUCT} photos.
                  Only the first {MAX_PHOTOS_PER_PRODUCT} will be uploaded; remove the extra ones or make another photo the main one.
                </Alert>
              )}
              {createError && <Alert tone="error" className="mt-3">{createError}</Alert>}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-espresso/75">
                  {okRows.length} product{okRows.length === 1 ? '' : 's'} · {rowsWithPhotos.length} with photos
                  {okRows.length - rowsWithPhotos.length > 0 && ` · ${okRows.length - rowsWithPhotos.length} without photos (you can add them later)`}
                </p>
                <Button onClick={createAll} disabled={locked || !okRows.length}>
                  Create {okRows.length} product{okRows.length === 1 ? '' : 's'}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {phase !== 'edit' && (
        <Card
          title={phase === 'done' ? (failed.length ? 'Finished, with some problems' : 'All done') : 'Creating products…'}
          subtitle={phase === 'done' ? undefined : 'Please keep this page open until it finishes.'}
        >
          {phase === 'creating' ? (
            <p className="inline-flex items-center gap-2 text-sm text-espresso/75">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving the products…
            </p>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-xs font-semibold text-espresso/75 mb-1">
                  <span>{doneCount} of {created.length} products ready</span>
                  <span>{created.length ? Math.round((doneCount / created.length) * 100) : 0}%</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-espresso/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={created.length}
                  aria-valuenow={doneCount}
                  aria-label="Products ready"
                >
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${created.length ? (doneCount / created.length) * 100 : 0}%` }} />
                </div>
              </div>
              <ul className="divide-y divide-espresso/8" aria-live="polite">
                {created.map((it) => {
                  const st = progress[it.row] || {};
                  const nPhotos = Math.min((match.assign[it.row] || []).length, MAX_PHOTOS_PER_PRODUCT);
                  return (
                    <li key={it.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <span className="w-5 shrink-0" aria-hidden="true">
                        {st.state === 'done' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                        {st.state === 'failed' && <AlertTriangle className="h-5 w-5 text-red-700" />}
                        {(st.state === 'uploading' || st.state === 'waiting') && (
                          <Loader2 className={cn('h-5 w-5 text-espresso/50', st.state === 'uploading' && 'animate-spin')} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-espresso">{it.name}</span>
                        <span className="block text-xs text-espresso/70">
                          {st.state === 'failed'
                            ? st.error
                            : st.state === 'done'
                              ? `${nPhotos ? `${nPhotos} photo${nPhotos === 1 ? '' : 's'} · ` : ''}${it.publish_after_photos || it.is_active ? 'Published' : 'Saved as draft'}`
                              : st.state === 'uploading' ? 'Uploading photos…' : 'Waiting…'}
                        </span>
                      </span>
                      {st.state === 'failed' && phase === 'done' && (
                        <Button size="sm" variant="outline" onClick={() => retry(it)}>
                          <RotateCcw className="h-4 w-4" /> Try again
                        </Button>
                      )}
                      <Link to={`/admin/products/${it.id}/edit`} className="text-xs font-semibold text-primary hover:underline">
                        Edit
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {phase === 'done' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button to="/admin/products">See all products</Button>
                  <Button variant="outline" onClick={startOver}>Upload another sheet</Button>
                </div>
              )}
              {phase === 'done' && failed.length > 0 && (
                <Alert tone="warning" className="mt-3">
                  Products whose photos didn&apos;t upload were kept as drafts, so customers don&apos;t see them half-finished.
                  Press “Try again”, or add the photos from the product&apos;s Edit page.
                </Alert>
              )}
            </>
          )}
        </Card>
      )}
    </Page>
  );
}

function Thumb({ photo, className }) {
  return photo.thumb ? (
    <img src={photo.thumb} alt="" className={cn('aspect-square w-full rounded-md object-cover bg-ivory', className)} />
  ) : (
    <span className={cn('block aspect-square w-full rounded-md shimmer-bg', className)} aria-hidden="true" />
  );
}

function ReviewRow({ row, ids, photoById, onRemove, onMain }) {
  const spec = resolveModel({ name: row.name, slug: row.slug, category: row.category ? { name: row.category } : null, model_type: row.model_type });
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
      <div className="min-w-0 sm:w-72 sm:shrink-0">
        <p className="font-medium text-espresso">{row.name}</p>
        <p className="mt-0.5 text-xs text-espresso/70">
          {[
            row.price != null ? formatINR(row.price) : 'Price on request',
            row.category || 'No category',
            row.stock === -1 || row.stock == null ? 'Unlimited stock' : `${row.stock} in stock`,
          ].join(' · ')}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Pill className={row.status === 'draft' ? 'bg-espresso/5 text-espresso/75' : 'bg-primary-50 text-primary-dark'}>
            {row.status === 'draft' ? 'Draft' : 'Published'}
          </Pill>
          <Pill className={spec.type === 'none' ? 'bg-espresso/5 text-espresso/70' : 'bg-gold-100 text-gold-800'}>
            <Box className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {spec.type === 'none' ? 'No 3D view' : `3D: ${MODEL_LABELS[spec.type]}`}
          </Pill>
        </div>
      </div>
      <div className="flex-1">
        {ids.length === 0 ? (
          <p className="text-xs text-espresso/60">No photos matched.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {ids.map((id, i) => {
              const p = photoById[id];
              if (!p) return null;
              const extra = i >= MAX_PHOTOS_PER_PRODUCT;
              return (
                <li key={id} className={cn('relative w-20', extra && 'opacity-40')}>
                  <Thumb photo={p} className={i === 0 ? 'ring-2 ring-gold' : undefined} />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-gold px-1 text-[10px] font-bold text-espresso">Main</span>
                  )}
                  {extra && <span className="absolute inset-x-0 bottom-6 text-center text-[10px] font-bold text-espresso">Extra</span>}
                  <div className="mt-1 flex justify-between">
                    {i !== 0 ? (
                      <button type="button" onClick={() => onMain(id)} className="rounded p-1 text-espresso/70 hover:text-primary" aria-label={`Make ${p.name} the main photo of ${row.name}`} title="Make main photo">
                        <Star className="h-4 w-4" />
                      </button>
                    ) : <span />}
                    <button type="button" onClick={() => onRemove(id)} className="rounded p-1 text-espresso/70 hover:text-red-700" aria-label={`Remove ${p.name} from ${row.name}`} title="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}
