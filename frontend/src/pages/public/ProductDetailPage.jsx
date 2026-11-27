import { useEffect, useState, useRef, useMemo, useId } from 'react';
import { useParams, Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Maximize2, Box } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import {
  useCart,
  formatINR,
  maxQuantityFor,
  normalizeStock,
  validPrice,
} from '../../services/cart';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { StarRating } from '../../components/ui/StarRating';
import { WishlistButton } from '../../components/ui/WishlistButton';
import { ProductCard } from '../../components/ui/ProductCard';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { resolveModel, canRender3D } from '../../components/product3d/modelSpec';
import { Product3DNote, Product3DView } from '../../components/product3d/Product3DView';

/* stock: -1 = unlimited / not tracked, 0 = out of stock, 1+ = units left (backend rule) */
function StockBadge({ stock }) {
  const s = normalizeStock(stock);
  if (s === 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1"><span aria-hidden="true">✕</span> Out of Stock</span>;
  }
  if (s > 0 && s <= 5) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1"><span aria-hidden="true">⚡</span> Only {s} left</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1"><span aria-hidden="true">✓</span> In Stock</span>;
}

/* ── Reviews ─────────────────────────────────────────────────────────────── */

const REVIEW_LIMIT = 5;
const EMPTY_REVIEW = { reviewer_name: '', rating: 5, title: '', comment: '' };
const REVIEW_FIELDS = ['reviewer_name', 'rating', 'title', 'comment'];

function inputClass(hasError) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-espresso placeholder:text-espresso/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
    hasError ? 'border-red-500' : 'border-cream-300'
  }`;
}

/* Same limits as the server (schemas/review.py → ReviewCreate). */
function validateReview(form) {
  const errors = {};
  const name = form.reviewer_name.trim();
  const comment = form.comment.trim();
  if (!name) errors.reviewer_name = 'Please enter your name.';
  else if (name.length > 255) errors.reviewer_name = 'Name must be at most 255 characters.';
  if (!(form.rating >= 1 && form.rating <= 5)) errors.rating = 'Please choose a rating from 1 to 5 stars.';
  if (form.title.trim().length > 255) errors.title = 'Title must be at most 255 characters.';
  if (!comment) errors.comment = 'Please write a few words about the product.';
  else if (comment.length > 3000) errors.comment = 'Comment must be at most 3000 characters.';
  return errors;
}

/** Map a FastAPI 422 (detail: [{loc: ['body', field], msg}]) onto the review fields. */
function reviewErrorsFrom422(err) {
  const detail = err?.response?.status === 422 ? err.response.data?.detail : null;
  if (!Array.isArray(detail)) return null;
  const errors = {};
  detail.forEach((d) => {
    const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
    if (REVIEW_FIELDS.includes(field) && !errors[field]) {
      errors[field] = String(d?.msg || 'Please check this field.').replace(/^Value error,\s*/i, '');
    }
  });
  return Object.keys(errors).length ? errors : null;
}

function ReviewsSection({ productId }) {
  const uid = useId();
  const ids = {
    heading: `${uid}-heading`,
    reviewer_name: `${uid}-name`,
    rating: `${uid}-rating`,
    title: `${uid}-title`,
    comment: `${uid}-comment`,
  };

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(EMPTY_REVIEW);
  const formRef = useRef(null);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setLoadError('');
    api
      .get(`/reviews/product/${productId}`, { params: { page, limit: REVIEW_LIMIT } })
      .then((res) => {
        if (stale) return;
        setReviews(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .catch((err) => {
        if (!stale) setLoadError(getErrorMessage(err, 'We couldn’t load reviews right now.'));
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => { stale = true; };
  }, [productId, page, reloadKey]);

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const focusFirstError = (errors) => {
    const first = REVIEW_FIELDS.find((f) => errors[f]);
    if (!first) return;
    const root = formRef.current;
    const el = first === 'rating'
      ? root?.querySelector('[role="radio"][tabindex="0"]')
      : document.getElementById(ids[first]);
    el?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError('');
    const errors = validateReview(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/reviews/product/${productId}`, {
        reviewer_name: form.reviewer_name.trim(),
        rating: form.rating,
        title: form.title.trim() || null,
        comment: form.comment.trim(),
      });
      setSubmitted(true);
      setShowForm(false);
      setForm(EMPTY_REVIEW);
      setFieldErrors({});
    } catch (err) {
      const mapped = reviewErrorsFrom422(err);
      if (mapped) {
        setFieldErrors(mapped);
        requestAnimationFrame(() => focusFirstError(mapped));
      } else {
        setSubmitError(getErrorMessage(err, 'We couldn’t submit your review. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const describedBy = (name, extra) =>
    [fieldErrors[name] ? `${ids[name]}-error` : null, extra].filter(Boolean).join(' ') || undefined;

  const fieldError = (name) =>
    fieldErrors[name] ? (
      <p id={`${ids[name]}-error`} className="mt-1 text-xs font-medium text-red-700">{fieldErrors[name]}</p>
    ) : null;

  const totalPages = Math.ceil(total / REVIEW_LIMIT);

  return (
    <section aria-labelledby={ids.heading} className="mt-10 border-t border-cream-200 pt-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={ids.heading} className="font-display text-xl font-semibold text-espresso">Customer Reviews</h2>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setSubmitted(false); setSubmitError(''); setFieldErrors({}); }}
          aria-expanded={showForm}
          className="text-xs font-semibold text-primary border border-primary rounded-full px-4 py-2 hover:bg-primary hover:text-cream transition-colors"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {submitted && (
        <div role="status" className="bg-primary/10 border border-primary/20 text-primary text-sm rounded-xl px-4 py-3">
          <span aria-hidden="true">✓ </span>Thank you! Your review has been submitted. It will appear here once our team has approved it.
        </div>
      )}

      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="bg-ivory border border-cream-200 rounded-xl p-4 space-y-4" noValidate>
          <p className="text-xs text-espresso/70">Fields marked <span aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={ids.reviewer_name} className="block text-xs font-semibold text-espresso mb-1">
                Your name <span aria-hidden="true">*</span>
              </label>
              <input
                id={ids.reviewer_name}
                value={form.reviewer_name}
                onChange={(e) => setField('reviewer_name', e.target.value)}
                required
                aria-required="true"
                aria-invalid={fieldErrors.reviewer_name ? 'true' : undefined}
                aria-describedby={describedBy('reviewer_name')}
                maxLength={255}
                autoComplete="name"
                className={inputClass(!!fieldErrors.reviewer_name)}
              />
              {fieldError('reviewer_name')}
            </div>
            <div>
              <span id={ids.rating} className="block text-xs font-semibold text-espresso mb-1">
                Rating <span aria-hidden="true">*</span>
              </span>
              <div className="flex items-center gap-2 min-h-[40px]">
                <StarRating
                  value={form.rating}
                  size="lg"
                  interactive
                  labelledBy={ids.rating}
                  describedBy={describedBy('rating')}
                  onChange={(v) => setField('rating', v)}
                />
                <span className="text-xs text-espresso/70" aria-hidden="true">{form.rating}/5</span>
              </div>
              {fieldError('rating')}
            </div>
          </div>
          <div>
            <label htmlFor={ids.title} className="block text-xs font-semibold text-espresso mb-1">
              Review title <span className="font-normal text-espresso/70">(optional)</span>
            </label>
            <input
              id={ids.title}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              maxLength={255}
              aria-invalid={fieldErrors.title ? 'true' : undefined}
              aria-describedby={describedBy('title')}
              className={inputClass(!!fieldErrors.title)}
            />
            {fieldError('title')}
          </div>
          <div>
            <label htmlFor={ids.comment} className="block text-xs font-semibold text-espresso mb-1">
              Your review <span aria-hidden="true">*</span>
            </label>
            <textarea
              id={ids.comment}
              value={form.comment}
              onChange={(e) => setField('comment', e.target.value)}
              required
              aria-required="true"
              aria-invalid={fieldErrors.comment ? 'true' : undefined}
              aria-describedby={describedBy('comment', `${ids.comment}-hint`)}
              maxLength={3000}
              rows={4}
              className={`${inputClass(!!fieldErrors.comment)} resize-y`}
            />
            {fieldError('comment')}
            <p id={`${ids.comment}-hint`} className="mt-1 text-[11px] text-espresso/70">
              Reviews are published after a quick check by our team.
            </p>
          </div>
          {submitError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-espresso/70" role="status">Loading reviews…</div>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-espresso/80">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-3 py-1.5 rounded-full border border-cream-300 bg-white text-xs font-semibold text-primary hover:border-primary transition-colors"
          >
            Try again
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-espresso/70 py-4">No reviews yet. Be the first to review!</div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="bg-white border border-cream-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StarRating value={r.rating} size="sm" />
                {r.is_verified_offline && (
                  <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Verified Purchase
                  </span>
                )}
              </div>
              {r.title && <div className="text-sm font-semibold text-espresso">{r.title}</div>}
              <div className="text-sm text-espresso/80 whitespace-pre-line">{r.comment}</div>
              <div className="text-xs text-espresso/70">
                — {r.reviewer_name}
                {r.created_at && (
                  <> &nbsp;·&nbsp; {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center gap-3" aria-label="Review pages">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-full border border-cream-300 text-xs font-semibold text-espresso disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
          >
            <span aria-hidden="true">← </span>Prev
          </button>
          <span className="text-xs text-espresso/70">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-full border border-cream-300 text-xs font-semibold text-espresso disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
          >
            Next<span aria-hidden="true"> →</span>
          </button>
        </nav>
      )}
    </section>
  );
}

/* ── Gallery + lightbox ──────────────────────────────────────────────────── */

const LB_ROUND_BTN =
  'absolute flex items-center justify-center rounded-full bg-cream/15 text-cream hover:bg-cream/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold';

function ImageGallery({ product }) {
  // images[0] is always the primary image; fall back to the legacy single image_path
  const allImages = product.images && product.images.length > 0
    ? product.images
    : product.image_path
      ? [{ id: 0, image_path: product.image_path, sort_order: 0 }]
      : [];

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const safeIdx = activeIdx < allImages.length ? activeIdx : 0;
  const active = allImages[safeIdx];
  const count = allImages.length;

  // 360° 3D preview: shape from the name/category (or the admin's choice),
  // colours from the stone name or the main photo. Only offered where WebGL works.
  const spec = useMemo(() => resolveModel(product), [product]);
  const has3D = spec.type !== 'none' && canRender3D();
  const [show3D, setShow3D] = useState(false);

  const frame3D = (
    <div className="space-y-2">
      <div className="relative w-full md:max-w-[calc(100vh_-_14rem)] mx-auto aspect-square overflow-hidden rounded-2xl border border-gold/25">
        <Product3DView spec={spec} label={product.name} />
      </div>
      <Product3DNote className="text-center md:max-w-[calc(100vh_-_14rem)] mx-auto" />
    </div>
  );

  if (count === 0) {
    return has3D ? frame3D : (
      <div className="w-full aspect-square rounded-2xl flex items-center justify-center text-sm text-espresso/70 bg-ivory border border-gold/25">
        No image available
      </div>
    );
  }

  const prev = () => setActiveIdx((i) => (i - 1 + count) % count);
  const next = () => setActiveIdx((i) => (i + 1) % count);

  // Escape, focus trap, scroll lock and focus return are handled by the Radix Dialog.
  const onLightboxKeyDown = (e) => {
    if (count < 2) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  };

  return (
    <>
      <div className="space-y-3">
        {show3D ? frame3D : (
        /* Main image — fills its square frame (uploads are stored as 1000×1000 squares).
           Capped to the viewport height on md+ so the sticky gallery always fits. */
        <div className="relative w-full md:max-w-[calc(100vh_-_14rem)] mx-auto">
        <button
          type="button"
          className="group relative block w-full aspect-square overflow-hidden rounded-2xl border border-gold/25 bg-white cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${product.name} image ${safeIdx + 1} of ${count} full screen`}
        >
          <img
            src={mediaUrl(active.image_path)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <span
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-espresso/75 px-2 py-1 text-[10px] font-bold tracking-wide text-cream opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
            aria-hidden="true"
          >
            <Maximize2 className="h-3 w-3" /> View full
          </span>
        </button>
        {has3D && (
          <button
            type="button"
            onClick={() => setShow3D(true)}
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-espresso shadow-sm ring-1 ring-gold/40 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Box className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            360° 3D view
          </button>
        )}
        </div>
        )}

        {(count > 1 || has3D) && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:justify-center">
            {allImages.map((img, idx) => (
              <button
                key={img.id ?? idx}
                type="button"
                onClick={() => { setActiveIdx(idx); setShow3D(false); }}
                aria-label={`Show image ${idx + 1} of ${count}`}
                aria-pressed={!show3D && idx === safeIdx}
                className={`shrink-0 h-16 w-16 overflow-hidden rounded-[10px] border-2 bg-white p-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  !show3D && idx === safeIdx ? 'border-gold' : 'border-espresso/15 hover:border-gold/60'
                }`}
              >
                <img src={mediaUrl(img.image_path)} alt="" loading="lazy" className="block h-full w-full object-cover" />
              </button>
            ))}
            {has3D && (
              <button
                type="button"
                onClick={() => setShow3D(true)}
                aria-label="Show the 360° 3D preview"
                aria-pressed={show3D}
                className={`shrink-0 h-16 w-16 flex flex-col items-center justify-center gap-0.5 rounded-[10px] border-2 bg-ivory text-espresso transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  show3D ? 'border-gold' : 'border-espresso/15 hover:border-gold/60'
                }`}
              >
                <Box className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="text-[10px] font-bold">360°</span>
              </button>
            )}
          </div>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          hideClose
          aria-describedby={undefined}
          onKeyDown={onLightboxKeyDown}
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false); }}
          className="flex items-center justify-center gap-0 w-screen max-w-none h-dvh p-0 border-0 rounded-none sm:rounded-none bg-espresso/95 shadow-none"
        >
          <DialogTitle className="sr-only">
            {product.name} — image {safeIdx + 1} of {count}
          </DialogTitle>

          <img
            key={safeIdx}
            src={mediaUrl(active.image_path)}
            alt={product.name}
            draggable={false}
            className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg animate-in fade-in-0 zoom-in-95 duration-200"
          />

          <DialogClose asChild>
            <button type="button" aria-label="Close image viewer" className={`${LB_ROUND_BTN} top-4 right-4 h-11 w-11`}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </DialogClose>

          {count > 1 && (
            <>
              <button type="button" onClick={prev} aria-label="Previous image" className={`${LB_ROUND_BTN} left-3 sm:left-5 top-1/2 -translate-y-1/2 h-11 w-11`}>
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button type="button" onClick={next} aria-label="Next image" className={`${LB_ROUND_BTN} right-3 sm:right-5 top-1/2 -translate-y-1/2 h-11 w-11`}>
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-wider text-cream/80" aria-hidden="true">
                {safeIdx + 1} / {count}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RelatedProducts({ categoryId, currentProductId }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!categoryId) { setProducts([]); return undefined; }
    let stale = false;
    api.get('/products/catalog', { params: { category_id: categoryId, limit: 5 } })
      .then((res) => {
        if (stale) return;
        const items = (res.data?.items || []).filter((p) => p.id !== currentProductId).slice(0, 4);
        setProducts(items);
      })
      .catch(() => { if (!stale) setProducts([]); });
    return () => { stale = true; };
  }, [categoryId, currentProductId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-cream-200 pt-10 space-y-5" aria-labelledby="related-heading">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gold-700">Discover More</div>
        <h2 id="related-heading" className="font-display text-xl font-semibold text-espresso">You May Also Like</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [qty, setQty] = useState(1);
  const [addState, setAddState] = useState(null); // 'added' | 'max' | null
  const { addItem } = useCart();
  const whatsappNumber = useWhatsAppNumber();
  const addedTimer = useRef(null);
  const qtyLabelId = useId();

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    setProduct(null);
    setQty(1);
    setAddState(null);
    api.get(`/products/${encodeURIComponent(id)}`)
      .then((res) => {
        if (stale) return;
        setProduct(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (stale) return;
        const code = err?.response?.status;
        if (code === 404 || code === 422) {
          setStatus('notfound'); // unknown id, or a draft that isn't public
        } else {
          setLoadError(getErrorMessage(err, 'We couldn’t load this product.'));
          setStatus('error');
        }
      });
    return () => { stale = true; };
  }, [id, reloadKey]);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // NOTE: every hook must run before the early returns below — calling a hook
  // only after loading finishes changes the hook count and crashes React (#310).
  const productName = product?.name || '';
  const priceKnown = validPrice(product?.price) !== null;
  const waHref = useMemo(() => whatsappLink(
    whatsappNumber,
    priceKnown
      ? `Namaste! I'm interested in this product from Bhaktijyot:\n\n*${productName}*\n\n${window.location.href}`
      : `Namaste! I'd like to know the price of this product from Bhaktijyot:\n\n*${productName}*\n\n${window.location.href}`,
  ), [whatsappNumber, productName, priceKnown, id]); // `id` → the page URL changed

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-2" aria-busy="true">
        <span className="sr-only" role="status">Loading product…</span>
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl shimmer-bg" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 w-16 rounded-lg shimmer-bg" />)}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-7 rounded shimmer-bg w-3/4" />
          <div className="h-5 rounded shimmer-bg w-1/4" />
          <div className="h-24 rounded shimmer-bg" />
          <div className="h-12 rounded-full shimmer-bg" />
        </div>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-3">
        <h1 className="font-display text-3xl font-semibold text-espresso">Product not found</h1>
        <p className="text-sm text-espresso/70">
          This product may have been removed or isn&apos;t available right now.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/products" className="px-6 py-2.5 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors">
            Browse Products
          </Link>
          <a href={whatsappLink(whatsappNumber)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/8 transition-colors">
            <WhatsAppIcon className="h-4 w-4" />
            Ask on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (status === 'error' || !product) {
    return (
      <div role="alert" className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-3">
        <h1 className="font-display text-2xl font-semibold text-espresso">Something went wrong</h1>
        <p className="text-sm text-espresso/80">{loadError || 'We couldn’t load this product.'}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-6 py-2.5 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Try again
          </button>
          <Link to="/products" className="px-6 py-2.5 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const price = validPrice(product.price);
  const mrp = validPrice(product.mrp);
  const hasDiscount = price !== null && mrp !== null && mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const outOfStock = normalizeStock(product.stock) === 0;
  const canBuy = price !== null && !outOfStock;
  const maxQty = Math.max(1, maxQuantityFor(product.stock));

  const handleAddToCart = () => {
    if (!canBuy) return;
    const ok = addItem(product, qty);
    setAddState(ok ? 'added' : 'max');
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAddState(null), ok ? 2500 : 4000);
  };

  const addBtnClass = (extra) => `${extra} transition-colors ${
    !canBuy
      ? 'bg-cream-200 text-espresso/70 cursor-not-allowed'
      : 'bg-primary text-cream hover:bg-primary-dark'
  }`;

  const addLabelLong = outOfStock
    ? 'Out of Stock'
    : addState === 'added'
    ? '✓ Added to Cart'
    : addState === 'max'
    ? 'Maximum quantity in cart'
    : 'Add to Cart';

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-28 md:pb-10">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-espresso/70 flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span aria-hidden="true">›</span>
          <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
          {product.category && (
            <>
              <span aria-hidden="true">›</span>
              <Link to={`/products?categoryId=${product.category.id}`} className="hover:text-primary transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">›</span>
          <span className="text-espresso font-medium truncate max-w-[180px]" aria-current="page">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr,1fr] items-start">
          {/* Left — gallery, sticky just below the site header
              (80px mobile/tablet bar → 96px; 112px desktop header on lg → 128px) */}
          <div className="space-y-4 min-w-0 md:sticky md:top-24 lg:top-32 md:self-start">
            <ImageGallery key={product.id} product={product} />
            {product.video_path && (
              <video controls preload="metadata" className="w-full rounded-xl border border-cream-200 max-h-72 bg-espresso">
                <source src={mediaUrl(product.video_path)} />
              </video>
            )}
          </div>

          {/* Right — details */}
          <div className="space-y-5 min-w-0">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold text-espresso leading-snug">{product.name}</h1>
                  {product.badge && (
                    <span
                      className="mt-2 inline-block px-3 py-1 text-[10px] font-black uppercase rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #5A1010, #9A1818)',
                        color: '#FFF8F0',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {product.badge}
                    </span>
                  )}
                </div>
                <WishlistButton
                  productId={product.id}
                  productName={product.name}
                  size="md"
                  className="h-11 w-11 shrink-0 shadow-sm border border-cream-200"
                />
              </div>

              {product.rating_count > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating value={product.rating_avg ?? 0} size="md" />
                  <span className="text-sm text-espresso/80">
                    {Number(product.rating_avg ?? 0).toFixed(1)} ({product.rating_count} review{product.rating_count === 1 ? '' : 's'})
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {price !== null ? (
                  <span className="text-2xl font-bold text-primary">{formatINR(price)}</span>
                ) : (
                  <span className="text-xl font-semibold text-primary">Price on request</span>
                )}
                {hasDiscount && (
                  <>
                    <span className="text-base text-espresso/70 line-through">
                      <span className="sr-only">MRP </span>{formatINR(mrp)}
                    </span>
                    <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{discountPct}% OFF</span>
                  </>
                )}
              </div>
              {price === null && (
                <p className="mt-1 text-sm text-espresso/80">
                  This item isn&apos;t sold online. Message us on WhatsApp for the current price and availability.
                </p>
              )}

              <div className="mt-3">
                <StockBadge stock={product.stock} />
              </div>
            </div>

            <div className="space-y-3">
              {/* Quantity picker */}
              {canBuy && (
                <div className="flex items-center gap-3">
                  <span id={qtyLabelId} className="text-sm font-semibold text-espresso">Quantity:</span>
                  <div role="group" aria-labelledby={qtyLabelId} className="flex items-center border border-cream-300 rounded-full overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                      className="h-10 w-11 text-sm font-semibold text-espresso hover:bg-cream disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="h-10 leading-10 px-4 text-sm font-bold text-espresso border-x border-cream-300 min-w-[48px] text-center" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      disabled={qty >= maxQty}
                      aria-label="Increase quantity"
                      className="h-10 w-11 text-sm font-semibold text-espresso hover:bg-cream disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* CTA buttons — desktop / tablet (the phone layout uses the bottom bar) */}
              <div className="hidden md:flex flex-col gap-3">
                {price !== null && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canBuy}
                    className={addBtnClass('w-full inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold')}
                  >
                    {addLabelLong}
                  </button>
                )}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-colors ${
                    price === null
                      ? 'bg-primary text-cream hover:bg-primary-dark'
                      : 'border-2 border-primary text-primary hover:bg-primary hover:text-cream'
                  }`}
                >
                  <WhatsAppIcon />
                  {price === null ? 'Ask for the price on WhatsApp' : 'Enquire on WhatsApp'}
                </a>
              </div>

              {addState === 'added' && (
                <Link to="/cart" className="hidden md:inline-flex text-sm text-primary font-semibold hover:underline">
                  View Cart →
                </Link>
              )}
              {addState === 'max' && (
                <p className="text-sm text-espresso/80">
                  You already have the maximum available quantity of this item in your cart.{' '}
                  <Link to="/cart" className="font-semibold text-primary hover:underline">View cart</Link>
                </p>
              )}
              <span className="sr-only" aria-live="polite">
                {addState === 'added' ? `${product.name} added to cart` : ''}
              </span>

              {/* Trust notes */}
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                <li className="flex items-center gap-1.5 text-xs font-semibold text-gold-700">
                  <span aria-hidden="true">✓</span>Authentic &amp; Certified
                </li>
                <li className="flex items-center gap-1.5 text-xs font-semibold text-gold-700">
                  <span aria-hidden="true">💬</span>WhatsApp Support
                </li>
                <li className="flex items-center gap-1.5 text-xs font-semibold text-gold-700">
                  <span aria-hidden="true">🔒</span>Secure payment via Razorpay
                </li>
                <li>
                  <Link to="/shipping-returns" className="text-xs font-semibold text-gold-700 underline underline-offset-2 hover:text-primary">
                    Shipping &amp; returns policy
                  </Link>
                </li>
              </ul>
            </div>

            {product.description && (
              <div>
                <h2 className="text-sm font-semibold text-espresso mb-1">Description</h2>
                <p className="text-sm text-espresso/80 whitespace-pre-line leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.benefits && (
              <div>
                <h2 className="text-sm font-semibold text-espresso mb-1">Benefits</h2>
                <p className="text-sm text-espresso/80 whitespace-pre-line leading-relaxed">{product.benefits}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <ReviewsSection key={product.id} productId={product.id} />

        {/* Related Products */}
        <RelatedProducts categoryId={product.category?.id} currentProductId={product.id} />
      </div>

      {/* Sticky bottom bar — phones only. FloatingWhatsApp hides itself below md on
          /products/:id, so the two never overlap. */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ivory border-t border-cream-200 px-4 pt-3 flex items-center gap-2 shadow-[0_-4px_16px_rgba(28,18,9,0.08)]"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {price !== null ? (
          <>
            <div className="min-w-0 shrink">
              <div className="text-[11px] text-espresso/70">Price</div>
              <div className="text-base font-bold text-primary whitespace-nowrap">{formatINR(price)}</div>
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Enquire on WhatsApp"
              className="ml-auto flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-full border-2 border-primary text-primary text-sm font-semibold shrink-0"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden min-[380px]:inline">Enquire</span>
            </a>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canBuy}
              className={addBtnClass('h-11 px-5 rounded-full text-sm font-semibold shrink-0')}
            >
              {outOfStock ? 'Out of Stock' : addState === 'added' ? '✓ Added' : addState === 'max' ? 'Max in cart' : 'Add to Cart'}
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 shrink">
              <div className="text-[11px] text-espresso/70">Price</div>
              <div className="text-sm font-bold text-primary whitespace-nowrap">On request</div>
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-1 flex items-center justify-center gap-2 h-11 rounded-full bg-primary text-cream text-sm font-semibold"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Ask for price on WhatsApp
            </a>
          </>
        )}
      </div>
    </>
  );
}
