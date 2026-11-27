import api from '../../services/apiClient';
import { SLUG_HINT, SLUG_RE, fileExt, formatBytes, slugify } from './adminUtils';

/** Shared by the Add and Edit product pages. */

export const EMPTY_PRODUCT_FORM = {
  name: '',
  slug: '',
  description: '',
  benefits: '',
  badge: '',
  price: '',
  mrp: '',
  stock: '-1',
  category_id: '',
  sort_order: '0',
  is_active: true,
};

export function formFromProduct(p) {
  return {
    name: p.name ?? '',
    slug: p.slug ?? '',
    description: p.description ?? '',
    benefits: p.benefits ?? '',
    badge: p.badge ?? '',
    price: p.price != null ? String(p.price) : '',
    mrp: p.mrp != null ? String(p.mrp) : '',
    stock: p.stock != null ? String(p.stock) : '-1',
    category_id: p.category_id != null ? String(p.category_id) : '',
    sort_order: p.sort_order != null ? String(p.sort_order) : '0',
    is_active: p.is_active ?? true,
  };
}

const blank = (v) => String(v ?? '').trim() === '';

/** Returns { field: message } — empty object when the form is valid. */
export function validateProductForm(form) {
  const errors = {};
  if (blank(form.name)) errors.name = 'Name is required.';
  const slug = String(form.slug ?? '').trim();
  if (!slug) errors.slug = 'Slug is required.';
  else if (!SLUG_RE.test(slug)) errors.slug = SLUG_HINT;
  ['price', 'mrp'].forEach((k) => {
    if (blank(form[k])) return;
    const n = Number(form[k]);
    if (!Number.isFinite(n) || n < 0) errors[k] = 'Must be 0 or more.';
  });
  if (!blank(form.stock)) {
    const n = Number(form.stock);
    if (!Number.isInteger(n) || n < -1) errors.stock = 'Whole number; -1 means unlimited.';
  }
  if (!blank(form.sort_order) && !Number.isInteger(Number(form.sort_order))) {
    errors.sort_order = 'Whole number.';
  }
  return errors;
}

export function productPayload(form) {
  const num = (v) => (blank(v) ? null : Number(v));
  return {
    name: String(form.name).trim(),
    slug: String(form.slug).trim(),
    description: blank(form.description) ? null : form.description,
    benefits: blank(form.benefits) ? null : form.benefits,
    badge: blank(form.badge) ? null : String(form.badge).trim(),
    price: num(form.price),
    mrp: num(form.mrp),
    stock: blank(form.stock) ? -1 : Number(form.stock),
    category_id: form.category_id ? Number(form.category_id) : null,
    sort_order: blank(form.sort_order) ? 0 : Number(form.sort_order),
    is_active: Boolean(form.is_active),
  };
}

export function discountPct(price, mrp) {
  const p = Number(price);
  const m = Number(mrp);
  if (!p || !m || m <= p) return null;
  return Math.round((1 - p / m) * 100);
}

/** Server-generated slug, sanitised so it always passes ^[a-z0-9-]+$ (falls back to a local slug). */
export async function generateSlug(name) {
  try {
    const res = await api.post('/products/generate-slug', { name });
    return slugify(res.data?.slug) || slugify(name);
  } catch {
    return slugify(name);
  }
}

export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function videoFileError(file) {
  if (!file) return '';
  if (!['mp4', 'webm', 'mov'].includes(fileExt(file.name))) return 'Video must be an MP4, WebM or MOV file.';
  if (file.size > MAX_VIDEO_BYTES) return `Video exceeds the 50 MB limit (${formatBytes(file.size)}).`;
  return '';
}

export function sortImages(images) {
  return [...(images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
}

export const BADGE_PRESETS = ['Bestseller', 'New Arrival', 'Limited Edition', 'Hot', 'Organic'];
