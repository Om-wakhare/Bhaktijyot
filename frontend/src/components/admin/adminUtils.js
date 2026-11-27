import { useCallback, useRef } from 'react';

// ── Slugs ────────────────────────────────────────────────────────────────────

export const SLUG_RE = /^[a-z0-9-]+$/;
export const SLUG_HINT = 'Lowercase letters, digits and hyphens only — e.g. rose-quartz-bracelet';

/** Client-side slug that always satisfies SLUG_RE (accents stripped, other characters dropped). */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

// ── Category tree ────────────────────────────────────────────────────────────

/** Depth-first flatten of the /categories tree → [{...node, level}] (cycle-safe). */
export function flattenTree(nodes, level = 0, acc = [], seen = new Set()) {
  (nodes ?? []).forEach((n) => {
    if (!n || seen.has(n.id)) return;
    seen.add(n.id);
    acc.push({ ...n, level });
    flattenTree(n.children, level + 1, acc, seen);
  });
  return acc;
}

export function findNode(nodes, id) {
  const stack = [...(nodes ?? [])];
  const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    if (n.id === id) return n;
    stack.push(...(n.children ?? []));
  }
  return null;
}

/** The category itself plus all of its descendants. */
export function subtreeIds(nodes, id) {
  const ids = new Set();
  const root = findNode(nodes, id);
  const stack = root ? [root] : [];
  while (stack.length) {
    const n = stack.pop();
    if (!n || ids.has(n.id)) continue;
    ids.add(n.id);
    stack.push(...(n.children ?? []));
  }
  return ids;
}

export function indentLabel(level, name) {
  return `${'— '.repeat(level)}${name}`;
}

export const WORLD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'pooja', label: 'Pooja Samagri' },
  { value: 'crystals', label: 'Crystal World' },
  { value: 'gemstones', label: 'Gemstones' },
];

export const WORLD_HINT =
  'Storefront section. Subcategories inherit their parent’s world — set it on top-level categories.';

export function worldLabel(world) {
  return WORLD_OPTIONS.find((o) => o.value === (world ?? ''))?.label ?? world ?? 'None';
}

// ── Orders ───────────────────────────────────────────────────────────────────

export const ORDER_STATUS_META = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', className: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  abandoned: { label: 'Payment not completed', className: 'bg-gray-100 text-gray-500' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
};

/** Every status the list endpoint can filter on. */
export const ORDER_FILTER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'abandoned'];
/** Statuses an admin may set (never "abandoned" — the system sets that). */
export const ORDER_SETTABLE_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
/** Progression order, used to detect backward moves. */
export const ORDER_STATUS_RANK = { pending: 0, paid: 1, processing: 2, shipped: 3, delivered: 4 };

export function orderStatusMeta(status) {
  return ORDER_STATUS_META[status] ?? { label: status || '—', className: 'bg-gray-100 text-gray-700' };
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Parse an API timestamp; naive ISO strings are treated as UTC. */
export function parseServerDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  let s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s += 'Z';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const IST = 'Asia/Kolkata';

export function formatDateTime(value) {
  const d = parseServerDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(value) {
  const d = parseServerDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
}

/** A plain calendar date such as "2026-11-30" (no timezone shift). */
export function formatCalendarDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return value || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
}

export function formatINR(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileExt(name) {
  const m = /\.([^./\\]+)$/.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

// ── Phones ───────────────────────────────────────────────────────────────────

export function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** 10-digit Indian mobile (accepts +91 / 91 / 0 prefixes) or null. */
export function indianMobile10(value) {
  let d = phoneDigits(value);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 ? d : null;
}

export function whatsappLink(value) {
  const d = indianMobile10(value);
  return d ? `https://wa.me/91${d}` : null;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

export function httpStatus(err) {
  return err?.response?.status;
}

/**
 * Guards against out-of-order responses: call begin() before a request, then
 * only apply the result when isCurrent() is still true.
 *   const begin = useLatestRequest();
 *   const isCurrent = begin(); const res = await api.get(...); if (!isCurrent()) return;
 */
export function useLatestRequest() {
  const counter = useRef(0);
  return useCallback(() => {
    counter.current += 1;
    const id = counter.current;
    return () => id === counter.current;
  }, []);
}

// ── Cross-component signals ──────────────────────────────────────────────────

/** AdminLayout listens for this to refresh its sidebar badges. */
export const ADMIN_COUNTS_EVENT = 'bj:admin-counts-changed';

export function notifyAdminCountsChanged() {
  window.dispatchEvent(new Event(ADMIN_COUNTS_EVENT));
}
