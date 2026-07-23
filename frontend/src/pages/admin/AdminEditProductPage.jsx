import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { Button, Card, Field, Input, Page, Select, Textarea } from '../../components/admin/ui';

const BADGE_PRESETS = ['Bestseller', 'New Arrival', 'Limited Edition', 'Hot', 'Organic'];

function flattenCategories(nodes, level = 0, acc = []) {
  nodes.forEach((c) => {
    acc.push({ id: c.id, name: `${'— '.repeat(level)}${c.name}` });
    if (c.children?.length) flattenCategories(c.children, level + 1, acc);
  });
  return acc;
}

function makeSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function discountPct(price, mrp) {
  const p = Number(price), m = Number(mrp);
  if (!p || !m || m <= p) return null;
  return Math.round((1 - p / m) * 100);
}

export function AdminEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct]     = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', slug: '', description: '', benefits: '',
    badge: '', price: '', mrp: '', stock: '-1',
    category_id: '', sort_order: '0', is_active: true,
  });

  // Image management
  const [existingImages, setExistingImages]   = useState([]);
  const [dragOver, setDragOver]               = useState(null);
  const [newImageFiles, setNewImageFiles]     = useState([]);
  const [uploadingMedia, setUploadingMedia]   = useState(false);
  const [videoFile, setVideoFile]             = useState(null);
  const dragSrc = useRef(null);

  // Slugify generating
  const [generatingSlug, setGeneratingSlug]   = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load product + categories ──────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get('/categories'),
    ]).then(([pRes, cRes]) => {
      const p = pRes.data;
      setProduct(p);
      setExistingImages(p.images ?? []);
      setCategories(cRes.data);
      setForm({
        name:        p.name ?? '',
        slug:        p.slug ?? '',
        description: p.description ?? '',
        benefits:    p.benefits ?? '',
        badge:       p.badge ?? '',
        price:       p.price != null ? String(p.price) : '',
        mrp:         p.mrp  != null ? String(p.mrp)  : '',
        stock:       p.stock != null ? String(p.stock) : '-1',
        category_id: p.category_id != null ? String(p.category_id) : '',
        sort_order:  p.sort_order != null ? String(p.sort_order) : '0',
        is_active:   p.is_active ?? true,
      });
    }).catch(() => showToast('Failed to load product', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoSlug = async () => {
    if (!form.name) return;
    setGeneratingSlug(true);
    try {
      const res = await api.post('/products/generate-slug', { name: form.name });
      setForm((prev) => ({ ...prev, slug: res.data.slug }));
    } catch {
      setForm((prev) => ({ ...prev, slug: makeSlug(form.name) }));
    } finally {
      setGeneratingSlug(false);
    }
  };

  // ── Save core fields ───────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/products/${id}`, {
        name:        form.name,
        slug:        form.slug,
        description: form.description || null,
        benefits:    form.benefits    || null,
        badge:       form.badge       || null,
        price:       form.price       ? Number(form.price) : null,
        mrp:         form.mrp         ? Number(form.mrp)   : null,
        stock:       form.stock !== '' ? Number(form.stock) : -1,
        category_id: form.category_id ? Number(form.category_id) : null,
        sort_order:  Number(form.sort_order) || 0,
        is_active:   form.is_active,
      });
      showToast('Product saved successfully');
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Save failed';
      showToast(Array.isArray(detail) ? detail[0]?.msg : detail, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Upload new images/video ────────────────────────────────
  const handleUploadMedia = async () => {
    if (!newImageFiles.length && !videoFile) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      newImageFiles.forEach((f) => formData.append('images', f));
      if (videoFile) formData.append('video', videoFile);
      const res = await api.post(`/products/${id}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExistingImages(res.data.images ?? []);
      setNewImageFiles([]);
      setVideoFile(null);
      showToast('Media uploaded');
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Upload failed';
      showToast(detail, 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  // ── Image operations ───────────────────────────────────────
  const handleSetPrimary = async (imageId) => {
    await api.put(`/products/${id}/images/set-primary/${imageId}`);
    const res = await api.get(`/products/${id}/images`);
    setExistingImages(res.data);
    showToast('Primary image updated');
  };

  const handleDeleteImage = async (imageId) => {
    await api.delete(`/products/${id}/images/${imageId}`);
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    showToast('Image deleted');
  };

  // Drag-to-reorder
  const handleDragStart = (idx) => { dragSrc.current = idx; };
  const handleDragEnterSlot = (idx) => setDragOver(idx);
  const handleDragEnd = async () => {
    setDragOver(null);
    if (dragSrc.current === null) return;
    const reordered = [...existingImages];
    const [moved] = reordered.splice(dragSrc.current, 1);
    reordered.splice(dragOver ?? dragSrc.current, 0, moved);
    dragSrc.current = null;
    setExistingImages(reordered);
    try {
      await api.put(`/products/${id}/images/reorder`, {
        image_ids: reordered.map((img) => img.id),
      });
    } catch {
      showToast('Reorder failed', 'error');
    }
  };

  // ── Delete product ─────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await api.delete(`/products/${id}`);
      navigate('/admin/products');
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  if (loading) {
    return (
      <Page title="Edit Product">
        <div className="text-sm text-gray-500 py-10 text-center">Loading…</div>
      </Page>
    );
  }

  if (!product) {
    return (
      <Page title="Edit Product">
        <div className="text-sm text-red-500 py-10 text-center">Product not found.</div>
      </Page>
    );
  }

  const disc = discountPct(form.price, form.mrp);
  const flatCats = flattenCategories(categories);

  return (
    <Page
      title="Edit Product"
      description={`ID #${id} · ${product.name}`}
      actions={
        <Link to="/admin/products">
          <Button variant="outline" size="sm">← Back to Products</Button>
        </Link>
      }
    >
      {/* Toast */}
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

      <form onSubmit={handleSave} className="space-y-5 max-w-3xl">

        {/* ── Core fields ─────────────────────────────────── */}
        <Card title="Product Details">
          {/* Published toggle */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              style={{
                width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                background: form.is_active ? '#1D3D2C' : '#D1D5DB',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: form.is_active ? 22 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.18s',
              }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: form.is_active ? '#1D3D2C' : '#9CA3AF' }}>
              {form.is_active ? 'Published — visible on site' : 'Draft — hidden from public'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Name + slug */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *">
                <Input name="name" value={form.name} onChange={handleChange} required />
              </Field>
              <Field label="Slug *" hint="Lowercase letters, digits, and hyphens only">
                <div className="flex gap-2">
                  <Input
                    name="slug" value={form.slug} onChange={handleChange}
                    required style={{ flex: 1 }}
                  />
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={handleAutoSlug} disabled={generatingSlug || !form.name}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {generatingSlug ? '…' : 'Auto-generate'}
                  </Button>
                </div>
              </Field>
            </div>

            {/* Description + Benefits */}
            <Field label="Description">
              <Textarea name="description" value={form.description} onChange={handleChange} rows={6} />
            </Field>
            <Field label="Benefits">
              <Textarea name="benefits" value={form.benefits} onChange={handleChange} rows={6} />
            </Field>

            {/* Badge */}
            <Field label="Badge (top-left label on product card)">
              <Input
                name="badge" value={form.badge} onChange={handleChange}
                placeholder="e.g. Bestseller, New Arrival — leave blank for none"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {BADGE_PRESETS.map((b) => (
                  <button
                    key={b} type="button"
                    onClick={() => setForm((p) => ({ ...p, badge: b }))}
                    style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', border: '1.5px solid',
                      borderColor: form.badge === b ? '#1D3D2C' : '#D1D5DB',
                      background: form.badge === b ? '#1D3D2C' : 'white',
                      color: form.badge === b ? '#F4E4D1' : '#6B7280',
                      transition: 'all 0.15s',
                    }}
                  >
                    {b}
                  </button>
                ))}
                {form.badge && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, badge: '' }))}
                    style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11,
                      cursor: 'pointer', border: '1.5px solid #FCA5A5',
                      background: 'white', color: '#DC2626', fontWeight: 700,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </Field>

            {/* Price / MRP / Stock / Category / Sort */}
            <div className="grid gap-4 sm:grid-cols-5">
              <Field label="Price (₹)">
                <Input name="price" value={form.price} onChange={handleChange} type="number" min="0" step="0.01" />
              </Field>
              <Field label="MRP (₹)">
                <div>
                  <Input name="mrp" value={form.mrp} onChange={handleChange} type="number" min="0" step="0.01" />
                  {disc && (
                    <div className="mt-1 text-[11px] font-bold" style={{ color: '#1D3D2C' }}>
                      {disc}% discount
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Stock" hint="-1 = unlimited">
                <Input name="stock" value={form.stock} onChange={handleChange} type="number" />
              </Field>
              <Field label="Category">
                <Select name="category_id" value={form.category_id} onChange={handleChange}>
                  <option value="">No category</option>
                  {flatCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sort Order" hint="Lower = first">
                <Input name="sort_order" value={form.sort_order} onChange={handleChange} type="number" min="0" />
              </Field>
            </div>
          </div>
        </Card>

        {/* ── Save button ──────────────────────────────────── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Link to="/admin/products">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>

      </form>

      {/* ── Images & Media ────────────────────────────────── */}
      <div className="max-w-3xl mt-5 space-y-5">
        <Card
          title="Images"
          subtitle={`${existingImages.length}/4 uploaded — drag to reorder, first image is primary`}
        >
          {/* Existing images grid */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              {existingImages.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnterSlot(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    position: 'relative', borderRadius: 8, overflow: 'hidden',
                    border: `2px solid ${dragOver === idx ? '#C9A84C' : idx === 0 ? '#1D3D2C' : '#E5E7EB'}`,
                    cursor: 'grab', aspectRatio: '1',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <img
                    src={mediaUrl(img.image_path)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {idx === 0 && (
                    <span style={{
                      position: 'absolute', top: 4, left: 4,
                      padding: '2px 6px', borderRadius: 99,
                      fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                      background: '#1D3D2C', color: '#F4E4D1', letterSpacing: '0.1em',
                    }}>
                      Primary
                    </span>
                  )}
                  {/* Action overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(22,10,4,0.60)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 4,
                    opacity: 0, transition: 'opacity 0.18s',
                  }}
                    className="img-actions"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(img.id)}
                        style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10,
                          fontWeight: 700, background: '#C9A84C', color: '#1C1209',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 10,
                        fontWeight: 700, background: '#8B1A1A', color: '#FFF8F0',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload new images */}
          {existingImages.length < 4 && (
            <div className="space-y-3">
              <ImageUploader
                existingCount={existingImages.length}
                onFilesChange={setNewImageFiles}
              />
              {newImageFiles.length > 0 && (
                <Button
                  type="button"
                  onClick={handleUploadMedia}
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? 'Uploading…' : `Upload ${newImageFiles.length} image${newImageFiles.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          )}

          {existingImages.length >= 4 && (
            <p className="text-xs text-gray-500">
              Maximum 4 images reached. Delete one to upload more.
            </p>
          )}
        </Card>

        {/* Video */}
        <Card title="Video (optional)">
          {product.video_path && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Current video:</p>
              <video
                src={mediaUrl(product.video_path)}
                controls
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
              />
            </div>
          )}
          <Field label={product.video_path ? 'Replace video' : 'Upload video'}>
            <input
              type="file"
              accept="video/*"
              className="text-sm"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          {videoFile && (
            <Button
              type="button"
              className="mt-3"
              onClick={handleUploadMedia}
              disabled={uploadingMedia}
            >
              {uploadingMedia ? 'Uploading…' : 'Upload Video'}
            </Button>
          )}
        </Card>

        {/* ── Danger zone ──────────────────────────────────── */}
        <Card title="Danger Zone">
          {!deleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Delete this product</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permanently removes the product, all its images, and reviews. Cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete Product
              </Button>
            </div>
          ) : (
            <div
              style={{
                padding: '14px 16px', borderRadius: 8,
                border: '1.5px solid #FCA5A5', background: '#FEF2F2',
              }}
            >
              <p className="text-sm font-semibold text-red-700 mb-3">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
                  Yes, delete permanently
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <style>{`
        .img-actions:hover { opacity: 1 !important; }
      `}</style>
    </Page>
  );
}
