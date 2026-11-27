import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { StockField } from '../../components/admin/StockField';
import { Model3DField } from '../../components/admin/Model3DField';
import {
  Alert, Button, Card, Field, FileInput, Input, Page, Select, Textarea, Toggle,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import {
  SLUG_HINT, flattenTree, formatBytes, indentLabel, slugConflictMessage, slugify, useLatestRequest,
} from '../../components/admin/adminUtils';
import {
  EMPTY_PRODUCT_FORM, VIDEO_ACCEPT, discountPct, generateSlug, productPayload, validateProductForm, videoFileError,
} from '../../components/admin/productForm';

export function AdminAddProductPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const beginSlugRequest = useLatestRequest();

  const [categories, setCategories] = useState([]);
  const [catError, setCatError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);

  // Slug follows the name until the admin edits it by hand
  const [slugTouched, setSlugTouched] = useState(false);
  const slugTouchedRef = useRef(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);

  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [videoInputKey, setVideoInputKey] = useState(0);

  const loadCategories = useCallback(async () => {
    setCatError('');
    try {
      const res = await api.get('/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCatError(getErrorMessage(err, 'Could not load categories.'));
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const flatCats = useMemo(() => flattenTree(categories), [categories]);

  // Debounced server slug (POST /products/generate-slug) while the slug is untouched
  useEffect(() => {
    if (slugTouched) return undefined;
    const name = form.name.trim();
    if (!name) return undefined;
    const timer = window.setTimeout(async () => {
      const isCurrent = beginSlugRequest();
      const slug = await generateSlug(name);
      if (isCurrent() && !slugTouchedRef.current && slug) {
        setForm((prev) => ({ ...prev, slug }));
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form.name, slugTouched, beginSlugRequest]);

  const setTouched = (value) => {
    slugTouchedRef.current = value;
    setSlugTouched(value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === 'slug') {
      // Clearing the slug hands control back to the name
      setTouched(value.trim() !== '');
      setForm((prev) => ({ ...prev, slug: value.trim() === '' ? slugify(prev.name) : value }));
      return;
    }
    if (name === 'name' && !slugTouchedRef.current) {
      setForm((prev) => ({ ...prev, name: value, slug: slugify(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoSlug = async () => {
    if (!form.name.trim()) return;
    setTouched(false);
    setGeneratingSlug(true);
    const isCurrent = beginSlugRequest();
    const slug = await generateSlug(form.name.trim());
    if (isCurrent()) setForm((prev) => ({ ...prev, slug }));
    setGeneratingSlug(false);
    setFieldErrors((prev) => ({ ...prev, slug: undefined }));
  };

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

  const clearVideo = () => {
    setVideoFile(null);
    setVideoError('');
    setVideoInputKey((k) => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    const errors = validateProductForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    let created;
    try {
      const res = await api.post('/products', productPayload(form));
      created = res.data;
    } catch (err) {
      setError(slugConflictMessage(err, 'product', form.slug.trim(), 'Could not create the product.'));
      setSaving(false);
      return;
    }

    if (created?.id && (imageFiles.length > 0 || videoFile)) {
      try {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append('images', f));
        if (videoFile) formData.append('video', videoFile);
        await api.post(`/products/${created.id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (err) {
        // The product exists now — never let the admin resubmit this form (duplicate slug).
        navigate(`/admin/products/${created.id}/edit`, {
          replace: true,
          state: {
            notice: {
              title: `"${created.name}" was created, but its images/video were not uploaded.`,
              message: `${getErrorMessage(err, 'The upload did not complete.')} Add them again below.`,
            },
          },
        });
        return;
      }
    }

    toast.success(`"${created?.name ?? form.name}" created`);
    navigate('/admin/products');
  };

  const disc = discountPct(form.price, form.mrp);

  return (
    <Page title="Add Product" description="Create a new product with pricing and media.">
      <Card title="Product Details" subtitle="Fill in product information and optionally attach images/video.">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl" noValidate>
          <div className="pb-4 border-b border-espresso/8">
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm((prev) => ({ ...prev, is_active: v }))}
              label={form.is_active ? 'Published — visible on site' : 'Draft — hidden from public'}
              description="You can change this any time from the edit page."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *" error={fieldErrors.name} htmlFor="p-name">
              <Input id="p-name" name="name" value={form.name} onChange={handleChange} required maxLength={255} />
            </Field>
            <Field
              label="Slug *"
              htmlFor="p-slug"
              error={fieldErrors.slug}
              hint={`${SLUG_HINT}. ${slugTouched ? 'Edited by hand.' : 'Generated from the name.'}`}
            >
              <div className="flex gap-2">
                <Input id="p-slug" name="slug" value={form.slug} onChange={handleChange} required className="flex-1" />
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

          <Field label="Description (optional)" htmlFor="p-description">
            <Textarea id="p-description" name="description" value={form.description} onChange={handleChange} rows={4} />
          </Field>

          <Field label="Benefits (optional)" htmlFor="p-benefits">
            <Textarea id="p-benefits" name="benefits" value={form.benefits} onChange={handleChange} rows={3} />
          </Field>

          <Field label="Product Badge (top-left label on card — e.g. #1 BEST-SELLER, NEW ARRIVAL, HOT)" htmlFor="p-badge">
            <Input
              id="p-badge"
              name="badge"
              value={form.badge}
              onChange={handleChange}
              placeholder="Leave blank for no badge"
              maxLength={100}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Price (₹, optional)" error={fieldErrors.price} htmlFor="p-price">
              <Input id="p-price" name="price" value={form.price} onChange={handleChange} placeholder="₹" type="number" inputMode="decimal" min="0" step="0.01" />
            </Field>
            <Field
              label="MRP (₹, optional)"
              htmlFor="p-mrp"
              error={fieldErrors.mrp}
              hint={disc ? `${disc}% discount shown on the store` : 'Shown struck-through when higher than price'}
            >
              <Input id="p-mrp" name="mrp" value={form.mrp} onChange={handleChange} placeholder="₹" type="number" inputMode="decimal" min="0" step="0.01" />
            </Field>
            <Field label="Category (optional)" error={catError || undefined} htmlFor="p-category">
              <Select id="p-category" name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">No category</option>
                {flatCats.map((c) => (
                  <option key={c.id} value={c.id}>{indentLabel(c.level, c.name)}</option>
                ))}
              </Select>
              {catError && (
                <button type="button" onClick={loadCategories} className="mt-1 text-[11px] font-semibold text-primary hover:underline">
                  Retry loading categories
                </button>
              )}
            </Field>
            <Field label="Sort Order" error={fieldErrors.sort_order} hint="Lower numbers are listed first" htmlFor="p-sort">
              <Input id="p-sort" name="sort_order" value={form.sort_order} onChange={handleChange} type="number" step="1" />
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

          <div className="pt-4 border-t border-espresso/8">
            <div className="text-sm font-semibold text-espresso mb-1">360° 3D view</div>
            <p className="text-xs text-espresso/60 mb-3">
              A turning 3D preview on the product page, made from the product name and main photo.
            </p>
            <Model3DField
              value={form.model_type}
              onChange={(v) => setForm((p) => ({ ...p, model_type: v }))}
              disabled={saving}
              hasPhoto={imageFiles.length > 0}
              draft={{
                name: form.name,
                slug: form.slug,
                category: flatCats.find((c) => String(c.id) === String(form.category_id)) || null,
                model_colors: null,
              }}
            />
          </div>

          <div className="pt-4 border-t border-espresso/8">
            <div className="text-sm font-semibold text-espresso mb-3">Media (optional)</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Images (up to 4 — the first is the primary image)">
                <ImageUploader existingCount={0} onFilesChange={setImageFiles} disabled={saving} />
              </Field>
              <Field label="Video" error={videoError || undefined} hint="MP4, WebM or MOV · max 50 MB">
                <FileInput key={videoInputKey} accept={VIDEO_ACCEPT} onChange={onVideoChange} disabled={saving} />
                {videoFile && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-espresso/70">
                    <span className="truncate">{videoFile.name} · {formatBytes(videoFile.size)}</span>
                    <button type="button" onClick={clearVideo} className="min-h-[32px] px-1 font-semibold text-red-700 hover:underline">
                      Remove
                    </button>
                  </div>
                )}
              </Field>
            </div>
            <div className="mt-2 text-[11px] text-espresso/60">
              Images and video are uploaded right after the product is created.
            </div>
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create product'}
            </Button>
            <Button variant="outline" to="/admin/products" disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
