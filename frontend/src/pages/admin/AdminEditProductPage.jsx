import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { StockField } from '../../components/admin/StockField';
import {
  Alert, Button, Card, ErrorState, Field, FileInput, Input, LoadingState, Page, Select, Textarea, Toggle, cn,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import {
  SLUG_HINT, flattenTree, formatBytes, httpStatus, indentLabel, slugConflictMessage, useLatestRequest,
} from '../../components/admin/adminUtils';
import {
  BADGE_PRESETS, EMPTY_PRODUCT_FORM, VIDEO_ACCEPT, discountPct, formFromProduct, generateSlug,
  productPayload, sortImages, validateProductForm, videoFileError,
} from '../../components/admin/productForm';

const MAX_IMAGES = 4;
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export function AdminEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const beginRequest = useLatestRequest();

  // Message handed over by the Add page (e.g. product created but media upload failed)
  const [notice, setNotice] = useState(() => location.state?.notice ?? null);
  useEffect(() => {
    if (location.state?.notice) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    // Only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [generatingSlug, setGeneratingSlug] = useState(false);

  // Images
  const [existingImages, setExistingImages] = useState([]);
  const [imageBusyId, setImageBusyId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragSrc = useRef(null);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Video
  const [videoFile, setVideoFile] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [videoInputKey, setVideoInputKey] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const applyProduct = useCallback((p) => {
    setProduct(p);
    setExistingImages(sortImages(p?.images));
  }, []);

  // ── Load product + categories ──────────────────────────────
  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const [pRes, cRes] = await Promise.all([api.get(`/products/${id}`), api.get('/categories')]);
      if (!isCurrent()) return;
      applyProduct(pRes.data);
      setForm(formFromProduct(pRes.data));
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      if (!isCurrent()) return;
      setLoadError(
        httpStatus(err) === 404
          ? 'Product not found — it may have been deleted.'
          : getErrorMessage(err, 'Could not load the product.'),
      );
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [id, beginRequest, applyProduct]);

  useEffect(() => { load(); }, [load]);

  /** Re-read the product and its images (keeps unsaved form edits). */
  const refreshMedia = useCallback(async () => {
    const [pRes, iRes] = await Promise.all([api.get(`/products/${id}`), api.get(`/products/${id}/images`)]);
    setProduct(pRes.data);
    setExistingImages(sortImages(iRes.data));
  }, [id]);

  const flatCats = useMemo(() => flattenTree(categories), [categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoSlug = async () => {
    if (!form.name.trim()) return;
    setGeneratingSlug(true);
    const slug = await generateSlug(form.name.trim());
    setForm((prev) => ({ ...prev, slug }));
    setFieldErrors((prev) => ({ ...prev, slug: undefined }));
    setGeneratingSlug(false);
  };

  // ── Save core fields ───────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    const errors = validateProductForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/products/${id}`, productPayload(form));
      applyProduct(res.data);
      setForm(formFromProduct(res.data));
      toast.success('Product saved');
    } catch (err) {
      toast.error(slugConflictMessage(err, 'product', form.slug.trim(), 'Could not save the product.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Upload new images ──────────────────────────────────────
  const handleUploadImages = async () => {
    if (!newImageFiles.length || uploadingImages) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      newImageFiles.forEach((f) => formData.append('images', f));
      const res = await api.post(`/products/${id}/media`, formData, MULTIPART);
      const count = newImageFiles.length;
      applyProduct(res.data);
      setNewImageFiles([]);
      setUploaderKey((k) => k + 1); // fresh uploader: clears its selection and previews
      toast.success(`${count} image${count > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Image upload failed.'));
    } finally {
      setUploadingImages(false);
    }
  };

  // ── Video ──────────────────────────────────────────────────
  const onVideoChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    const err = videoFileError(file);
    setVideoError(err);
    if (err) {
      setVideoFile(null);
      setVideoInputKey((k) => k + 1);
      return;
    }
    setVideoFile(file);
  };

  const handleUploadVideo = async () => {
    if (!videoFile || uploadingVideo) return;
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      const res = await api.post(`/products/${id}/media`, formData, MULTIPART);
      applyProduct(res.data); // includes the new video_path
      setVideoFile(null);
      setVideoInputKey((k) => k + 1);
      toast.success('Video uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Video upload failed.'));
    } finally {
      setUploadingVideo(false);
    }
  };

  // ── Image operations ───────────────────────────────────────
  const handleSetPrimary = async (imageId) => {
    setImageBusyId(imageId);
    try {
      // The server moves the image to position 0 and returns the product
      const res = await api.put(`/products/${id}/images/set-primary/${imageId}`);
      if (res.data) applyProduct(res.data);
      await refreshMedia().catch(() => {});
      toast.success('Primary image updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not set the primary image.'));
    } finally {
      setImageBusyId(null);
    }
  };

  const handleDeleteImage = async (img, idx) => {
    const ok = await confirm({
      title: 'Delete this image?',
      message:
        idx === 0 && existingImages.length > 1
          ? 'This is the primary image — the next image will become primary. The file is removed permanently.'
          : 'The image file is removed permanently.',
      confirmLabel: 'Delete image',
      tone: 'danger',
    });
    if (!ok) return;
    setImageBusyId(img.id);
    try {
      await api.delete(`/products/${id}/images/${img.id}`);
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success('Image deleted');
      await refreshMedia().catch(() => {});
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the image.'));
    } finally {
      setImageBusyId(null);
    }
  };

  // Reorder (drag on a computer, arrow buttons on phones). The first image is the primary one.
  const moveImage = async (from, to) => {
    if (from === to || to < 0 || to >= existingImages.length || imageBusyId) return;
    const reordered = [...existingImages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setExistingImages(reordered);
    setImageBusyId(moved.id);
    try {
      const res = await api.put(`/products/${id}/images/reorder`, {
        image_ids: reordered.map((img) => img.id),
      });
      if (Array.isArray(res.data)) setExistingImages(sortImages(res.data));
      await refreshMedia().catch(() => {});
      toast.success(to === 0 || from === 0 ? 'Order saved. Primary image updated.' : 'Image order saved');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change the image order.'));
      refreshMedia().catch(() => {});
    } finally {
      setImageBusyId(null);
    }
  };

  const handleDragStart = (idx) => { dragSrc.current = idx; };
  const handleDragEnterSlot = (idx) => setDragOver(idx);
  const handleDragEnd = () => {
    const target = dragOver;
    setDragOver(null);
    if (dragSrc.current === null) return;
    const from = dragSrc.current;
    dragSrc.current = null;
    if (target === null || target === from) return;
    moveImage(from, target);
  };

  // ── Delete / unpublish product ─────────────────────────────
  const handleUnpublish = async () => {
    try {
      const res = await api.put(`/products/${id}`, { is_active: false });
      applyProduct(res.data);
      setForm((prev) => ({ ...prev, is_active: false }));
      toast.success('Product unpublished — it is now a draft, hidden from the store.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not unpublish the product.'));
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${product?.name}"?`,
      message: 'This permanently removes the product, all its images, and reviews. It cannot be undone.',
      confirmLabel: 'Delete permanently',
      tone: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      navigate('/admin/products');
    } catch (err) {
      setDeleting(false);
      if (httpStatus(err) === 409) {
        const alreadyDraft = product?.is_active === false;
        const unpub = await confirm({
          title: 'This product can’t be deleted',
          message: getErrorMessage(err),
          confirmLabel: alreadyDraft ? 'OK' : 'Unpublish instead',
          cancelLabel: alreadyDraft ? null : 'Keep as is',
        });
        if (unpub && !alreadyDraft) await handleUnpublish();
        return;
      }
      toast.error(getErrorMessage(err, 'Delete failed.'));
    }
  };

  // ── Render ─────────────────────────────────────────────────
  if (loading && !product) {
    return (
      <Page title="Edit Product">
        <Card><LoadingState label="Loading product…" /></Card>
      </Page>
    );
  }

  if (!product) {
    return (
      <Page
        title="Edit Product"
        actions={<Button variant="outline" size="sm" to="/admin/products">← Back to Products</Button>}
      >
        <Card><ErrorState message={loadError || 'Could not load the product.'} onRetry={load} /></Card>
      </Page>
    );
  }

  const disc = discountPct(form.price, form.mrp);
  const imageCount = existingImages.length;

  return (
    <Page
      title="Edit Product"
      description={`ID #${id} · ${product.name}`}
      actions={<Button variant="outline" size="sm" to="/admin/products">← Back to Products</Button>}
    >
      {notice && (
        <Alert tone="warning" title={notice.title} onDismiss={() => setNotice(null)} className="max-w-3xl">
          {notice.message}
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-5 max-w-3xl" noValidate>
        {/* ── Core fields ─────────────────────────────────── */}
        <Card title="Product Details">
          <div className="mb-5 pb-4 border-b border-espresso/8">
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              label={form.is_active ? 'Published — visible on site' : 'Draft — hidden from public'}
              description="Saved with “Save Changes”."
            />
          </div>

          <div className="space-y-4">
            {/* Name + slug */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *" error={fieldErrors.name} htmlFor="ep-name">
                <Input id="ep-name" name="name" value={form.name} onChange={handleChange} required maxLength={255} />
              </Field>
              <Field label="Slug *" error={fieldErrors.slug} hint={SLUG_HINT} htmlFor="ep-slug">
                <div className="flex gap-2">
                  <Input id="ep-slug" name="slug" value={form.slug} onChange={handleChange} required className="flex-1" />
                  <Button
                    variant="outline" size="sm"
                    onClick={handleAutoSlug}
                    disabled={generatingSlug || !form.name.trim()}
                    className="whitespace-nowrap shrink-0"
                  >
                    {generatingSlug ? '…' : 'Auto-generate'}
                  </Button>
                </div>
              </Field>
            </div>

            {/* Description + Benefits */}
            <Field label="Description" htmlFor="ep-description">
              <Textarea id="ep-description" name="description" value={form.description} onChange={handleChange} rows={6} />
            </Field>
            <Field label="Benefits" htmlFor="ep-benefits">
              <Textarea id="ep-benefits" name="benefits" value={form.benefits} onChange={handleChange} rows={6} />
            </Field>

            {/* Badge */}
            <Field label="Badge (top-left label on product card)" htmlFor="ep-badge">
              <Input
                id="ep-badge"
                name="badge" value={form.badge} onChange={handleChange} maxLength={100}
                placeholder="e.g. Bestseller, New Arrival — leave blank for none"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {BADGE_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={form.badge === b}
                    onClick={() => setForm((p) => ({ ...p, badge: b }))}
                    className={cn(
                      'min-h-[32px] px-3 py-1 rounded-full text-[11px] font-bold border-[1.5px] transition-colors',
                      form.badge === b
                        ? 'border-primary bg-primary text-cream'
                        : 'border-espresso/20 bg-white text-espresso/70 hover:border-primary',
                    )}
                  >
                    {b}
                  </button>
                ))}
                {form.badge && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, badge: '' }))}
                    className="min-h-[32px] px-3 py-1 rounded-full text-[11px] font-bold border-[1.5px] border-red-300 bg-white text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </Field>

            {/* Price / MRP / Stock / Category / Sort */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Price (₹)" error={fieldErrors.price} htmlFor="ep-price">
                <Input id="ep-price" name="price" value={form.price} onChange={handleChange} type="number" inputMode="decimal" min="0" step="0.01" />
              </Field>
              <Field
                label="MRP (₹)"
                htmlFor="ep-mrp"
                error={fieldErrors.mrp}
                hint={disc ? `${disc}% discount` : 'Shown struck-through when higher than price'}
              >
                <Input id="ep-mrp" name="mrp" value={form.mrp} onChange={handleChange} type="number" inputMode="decimal" min="0" step="0.01" />
              </Field>
              <Field label="Category" htmlFor="ep-category">
                <Select id="ep-category" name="category_id" value={form.category_id} onChange={handleChange}>
                  <option value="">No category</option>
                  {flatCats.map((c) => (
                    <option key={c.id} value={c.id}>{indentLabel(c.level, c.name)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sort Order" error={fieldErrors.sort_order} hint="Lower = first" htmlFor="ep-sort">
                <Input id="ep-sort" name="sort_order" value={form.sort_order} onChange={handleChange} type="number" step="1" />
              </Field>
            </div>

            <div className="max-w-md">
              <StockField
                tracked={form.stock_tracked}
                count={form.stock}
                error={fieldErrors.stock}
                disabled={saving}
                onChange={({ tracked, count }) => {
                  setFieldErrors((prev) => ({ ...prev, stock: undefined }));
                  setForm((prev) => ({ ...prev, stock_tracked: tracked, stock: count }));
                }}
              />
            </div>
          </div>
        </Card>

        {/* ── Save button ──────────────────────────────────── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button variant="outline" to="/admin/products">Cancel</Button>
        </div>
      </form>

      {/* ── Images & Media ────────────────────────────────── */}
      <div className="max-w-3xl space-y-5">
        <Card
          title="Images"
          subtitle={`${imageCount}/${MAX_IMAGES} uploaded. The first image is the primary image; use the arrows (or drag on a computer) to change the order.`}
        >
          {imageCount > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" aria-label="Product images">
              {existingImages.map((img, idx) => {
                const busy = imageBusyId === img.id;
                const isPrimary = idx === 0;
                const iconBtn =
                  'h-9 w-9 inline-flex items-center justify-center rounded-md border border-espresso/15 bg-white text-espresso/75 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed';
                return (
                  <li
                    key={img.id}
                    draggable={!imageBusyId}
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnterSlot(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      'flex flex-col overflow-hidden rounded-lg border-2 bg-white transition-colors',
                      dragOver === idx ? 'border-gold' : isPrimary ? 'border-primary' : 'border-espresso/10',
                      busy && 'opacity-60',
                    )}
                  >
                    <div className="relative aspect-square cursor-grab bg-ivory">
                      <img
                        src={mediaUrl(img.image_path)}
                        alt={`Image ${idx + 1}${isPrimary ? ' (primary)' : ''}`}
                        className="block h-full w-full object-cover"
                      />
                      {isPrimary && (
                        <span className="absolute top-1 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-cream">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 border-t border-espresso/8 p-1.5">
                      {isPrimary ? (
                        <span className="min-h-[36px] inline-flex items-center justify-center text-[11px] font-semibold text-primary">
                          Shown first on the store
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(imageBusyId)}
                          onClick={() => handleSetPrimary(img.id)}
                          className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-md bg-gold/20 px-2 text-[11px] font-bold text-gold-800 hover:bg-gold/30 disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" /> Make primary
                        </button>
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          className={iconBtn}
                          disabled={Boolean(imageBusyId) || idx === 0}
                          onClick={() => moveImage(idx, idx - 1)}
                          aria-label={`Move image ${idx + 1} earlier`}
                          title="Move earlier"
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          disabled={Boolean(imageBusyId) || idx === imageCount - 1}
                          onClick={() => moveImage(idx, idx + 1)}
                          aria-label={`Move image ${idx + 1} later`}
                          title="Move later"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={cn(iconBtn, 'text-red-700 hover:border-red-400 hover:text-red-800')}
                          disabled={Boolean(imageBusyId)}
                          onClick={() => handleDeleteImage(img, idx)}
                          aria-label={`Delete image ${idx + 1}`}
                          title="Delete image"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {imageCount < MAX_IMAGES ? (
            <div className="space-y-3">
              <ImageUploader
                key={uploaderKey}
                existingCount={imageCount}
                onFilesChange={setNewImageFiles}
                disabled={uploadingImages}
              />
              {newImageFiles.length > 0 && (
                <Button onClick={handleUploadImages} disabled={uploadingImages}>
                  {uploadingImages
                    ? 'Uploading…'
                    : `Upload ${newImageFiles.length} image${newImageFiles.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-espresso/60">Maximum {MAX_IMAGES} images reached. Delete one to upload more.</p>
          )}
        </Card>

        {/* Video */}
        <Card title="Video (optional)">
          {product.video_path && (
            <div className="mb-4">
              <p className="text-xs text-espresso/60 mb-2">Current video:</p>
              <video
                key={product.video_path}
                src={mediaUrl(product.video_path)}
                controls
                className="max-w-full max-h-[200px] rounded-lg"
              />
            </div>
          )}
          <Field
            label={product.video_path ? 'Replace video' : 'Upload video'}
            error={videoError || undefined}
            hint="MP4, WebM or MOV · max 50 MB"
          >
            <FileInput key={videoInputKey} accept={VIDEO_ACCEPT} onChange={onVideoChange} disabled={uploadingVideo} />
          </Field>
          {videoFile && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button onClick={handleUploadVideo} disabled={uploadingVideo}>
                {uploadingVideo ? 'Uploading…' : 'Upload Video'}
              </Button>
              <span className="text-[11px] text-espresso/60">{videoFile.name} · {formatBytes(videoFile.size)}</span>
            </div>
          )}
        </Card>

        {/* ── Danger zone ──────────────────────────────────── */}
        <Card title="Danger Zone">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-espresso">Delete this product</p>
              <p className="text-xs text-espresso/60 mt-0.5">
                Permanently removes the product, all its images, and reviews. Products that have orders
                can’t be deleted — unpublish them instead.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting} className="shrink-0">
              {deleting ? 'Deleting…' : 'Delete Product'}
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
