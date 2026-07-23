import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { useCart } from '../../services/cart';
import { StarRating } from '../../components/ui/StarRating';
import { WishlistButton } from '../../components/ui/WishlistButton';
import { ProductCard } from '../../components/ui/ProductCard';

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function StockBadge({ stock }) {
  if (stock === -1 || stock === undefined || stock === null) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">✓ In Stock</span>;
  }
  if (stock === 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">✕ Out of Stock</span>;
  }
  if (stock <= 5) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber bg-amber-50 border border-amber-200 rounded-full px-3 py-1">⚡ Only {stock} left!</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">✓ In Stock</span>;
}

function ReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({ reviewer_name: '', rating: 5, title: '', comment: '' });

  const LIMIT = 5;

  const loadReviews = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/product/${productId}`, { params: { page: p, limit: LIMIT } });
      setReviews(res.data.items || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadReviews(page); }, [page, loadReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reviewer_name || !form.comment) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.post(`/reviews/product/${productId}`, {
        reviewer_name: form.reviewer_name,
        rating: form.rating,
        title: form.title || undefined,
        comment: form.comment,
      });
      setSubmitted(true);
      setShowForm(false);
      setForm({ reviewer_name: '', rating: 5, title: '', comment: '' });
    } catch {
      setSubmitError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-10 border-t border-cream-200 pt-8 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-espresso">Customer Reviews</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-semibold text-primary border border-primary rounded-full px-4 py-2 hover:bg-primary hover:text-white transition-colors"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {submitted && (
        <div className="bg-primary/10 border border-primary/20 text-primary text-sm rounded-xl px-4 py-3">
          ✓ Thank you! Your review has been submitted and will appear after approval.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-cream border border-cream-200 rounded-xl p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-espresso mb-1">Your Name *</label>
              <input
                value={form.reviewer_name}
                onChange={(e) => setForm((p) => ({ ...p, reviewer_name: e.target.value }))}
                required
                placeholder="Your name"
                className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-espresso mb-1">Rating *</label>
              <div className="flex items-center gap-2 h-9">
                <StarRating
                  value={form.rating}
                  size="md"
                  interactive
                  onChange={(v) => setForm((p) => ({ ...p, rating: v }))}
                />
                <span className="text-xs text-espresso/50">{form.rating}/5</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-espresso mb-1">Review Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="One-line summary (optional)"
              className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-espresso mb-1">Comment *</label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
              required
              rows={3}
              placeholder="Share your experience..."
              className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          {submitError && (
            <p className="text-xs text-red-600 mt-1">{submitError}</p>
          )}
        </form>
      )}

      {loading ? (
        <div className="text-sm text-espresso/50">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-espresso/50 py-4">No reviews yet. Be the first to review!</div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-cream-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StarRating value={r.rating} size="sm" />
                {r.is_verified_offline && (
                  <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Verified Purchase
                  </span>
                )}
              </div>
              {r.title && <div className="text-sm font-semibold text-espresso">{r.title}</div>}
              <div className="text-sm text-espresso/70">{r.comment}</div>
              <div className="text-xs text-espresso/40">— {r.reviewer_name} &nbsp;·&nbsp; {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}

      {Math.ceil(total / LIMIT) > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-full border border-cream-200 text-xs font-semibold disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-espresso/50">Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / LIMIT)}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-full border border-cream-200 text-xs font-semibold disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function ImageGallery({ product }) {
  const allImages = product.images && product.images.length > 0
    ? product.images
    : product.image_path
      ? [{ id: 0, image_path: product.image_path, sort_order: 0 }]
      : [];

  const [activeIdx, setActiveIdx]     = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const active = allImages[activeIdx];

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape')      { setLightboxOpen(false); return; }
      if (e.key === 'ArrowRight')  setActiveIdx((i) => (i + 1) % allImages.length);
      if (e.key === 'ArrowLeft')   setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, allImages.length]);

  if (allImages.length === 0) {
    return (
      <div className="w-full h-72 bg-cream rounded-2xl flex items-center justify-center text-sm text-espresso/40">
        No image available
      </div>
    );
  }

  const lightbox = createPortal(
    <AnimatePresence>
      {lightboxOpen && (
        <motion.div
          key="bj-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={() => setLightboxOpen(false)}
          style={LB_OVERLAY}
        >
          <motion.img
            key={activeIdx}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.22 }}
            src={mediaUrl(active.image_path)}
            alt={product.name}
            onClick={(e) => e.stopPropagation()}
            style={LB_IMG}
            draggable={false}
          />

          {/* Close */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close lightbox"
            style={LB_CLOSE_BTN}
          >
            ✕
          </button>

          {/* Prev / Next */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
                aria-label="Previous image"
                style={LB_PREV_BTN}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i + 1) % allImages.length); }}
                aria-label="Next image"
                style={LB_NEXT_BTN}
              >
                ›
              </button>

              {/* Counter */}
              <div style={LB_COUNTER}>
                {activeIdx + 1} / {allImages.length}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          className="w-full group relative overflow-hidden"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open image fullscreen"
          style={{ borderRadius: '16px', border: '1.5px solid rgba(201,168,76,0.22)', background: '#F0E4CE', cursor: 'zoom-in' }}
        >
          <div className="aspect-square max-h-96 overflow-hidden" style={{ borderRadius: '14px' }}>
            <img
              src={mediaUrl(active.image_path)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          {/* Expand hint */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
               style={{
                 background: 'rgba(14,7,2,0.72)',
                 backdropFilter: 'blur(4px)',
                 borderRadius: 6,
                 padding: '4px 8px',
                 fontSize: 10,
                 fontWeight: 700,
                 color: '#F4E4D1',
                 letterSpacing: '0.06em',
               }}>
            ⛶ View full
          </div>
        </button>

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-pressed={idx === activeIdx}
                style={{
                  flexShrink: 0,
                  width: 64, height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: `2px solid ${idx === activeIdx ? '#C9A84C' : 'rgba(28,18,9,0.12)'}`,
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                  background: '#F0E4CE',
                  padding: 0,
                }}
              >
                <img src={mediaUrl(img.image_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
      </div>
      {lightbox}
    </>
  );
}

function RelatedProducts({ categoryId, currentProductId }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!categoryId) return;
    api.get('/products/catalog', { params: { category_id: categoryId, limit: 5 } })
      .then((res) => {
        const items = (res.data.items || []).filter((p) => p.id !== currentProductId).slice(0, 4);
        setProducts(items);
      })
      .catch(() => {});
  }, [categoryId, currentProductId]);

  if (products.length === 0) return null;

  return (
    <div className="mt-12 border-t border-cream-200 pt-10 space-y-5">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Discover More</div>
        <h2 className="font-display text-xl font-semibold" style={{ color: '#1C1209' }}>You May Also Like</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ── Lightbox style constants ── */
const LB_OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(14,7,2,0.97)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const LB_CLOSE_BTN = {
  position: 'absolute', top: 20, right: 20,
  width: 40, height: 40, borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#F4E4D1', fontSize: 20, lineHeight: 1,
};
const LB_PREV_BTN = {
  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
  width: 44, height: 44, borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#F4E4D1', fontSize: 20,
};
const LB_NEXT_BTN = {
  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
  width: 44, height: 44, borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#F4E4D1', fontSize: 20,
};
const LB_COUNTER = {
  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
  color: 'rgba(244,228,209,0.55)', fontSize: 12, fontWeight: 600,
  letterSpacing: '0.08em',
};
const LB_IMG = { maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '8px' };

const TRUST_BADGES = [
  { icon: '✓', label: 'Authentic & Certified' },
  { icon: '↩', label: 'Easy Returns' },
  { icon: '💬', label: 'WhatsApp Support' },
  { icon: '🔒', label: 'Secure Checkout' },
];

export function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const [whatsappNumber, setWhatsappNumber] = useState('918484913170');
  const addedTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [productRes, configRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get('/site-config'),
        ]);
        setProduct(productRes.data);
        if (configRes.data?.whatsapp_number) setWhatsappNumber(configRes.data.whatsapp_number);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const maxQty = product ? (product.stock === -1 ? 99 : product.stock) : 1;
  const outOfStock = product && product.stock !== -1 && product.stock === 0;

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    addItem(product, qty);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 2000);
  };

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-2 animate-pulse">
        <div className="space-y-3">
          <div className="aspect-square bg-cream-200 rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 w-16 bg-cream-200 rounded-lg" />)}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-cream-200 rounded w-3/4" />
          <div className="h-4 bg-cream-200 rounded w-1/4" />
          <div className="h-20 bg-cream-200 rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-sm text-red-500">Product not found.</div>
        <Link to="/products" className="mt-4 inline-block text-xs text-primary hover:underline">← Back to products</Link>
      </div>
    );
  }

  const waMessage = useMemo(() => encodeURIComponent(
    `Namaste! I'm interested in this product from Bhaktijyot:\n\n*${product.name}*\n\n${window.location.href}`,
  ), [product.name]);
  const hasDiscount = product.mrp && product.price && Number(product.mrp) > Number(product.price);
  const discountPct = hasDiscount ? Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100) : 0;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-28 md:pb-10">

        {/* Breadcrumb */}
        <nav className="text-xs text-espresso/40 flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>›</span>
          <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
          {product.category && (
            <>
              <span>›</span>
              <Link to={`/products?categoryId=${product.category?.id}`} className="hover:text-primary transition-colors">
                {product.category?.name}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="text-espresso font-medium truncate max-w-[180px]">{product.name}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-[1.1fr,1fr] items-start">
          {/* Left — Images + Video */}
          <div className="space-y-4">
            <ImageGallery product={product} />
            {product.video_path && (
              <video controls className="w-full rounded-xl border border-cream-200 max-h-72 bg-espresso">
                <source src={mediaUrl(product.video_path)} />
              </video>
            )}
          </div>

          {/* Right — Details (sticky) */}
          <div className="space-y-4" style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-espresso leading-snug">{product.name}</h1>
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
                <WishlistButton productId={product.id} size="md" className="h-10 w-10 shrink-0 shadow-sm border border-cream-200" />
              </div>

              {product.rating_count > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating value={product.rating_avg ?? 0} size="md" />
                  <span className="text-sm text-espresso/60">
                    {Number(product.rating_avg ?? 0).toFixed(1)} ({product.rating_count} reviews)
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {product.price !== null && product.price !== undefined && (
                  <span className="text-2xl font-bold text-gold">
                    ₹ {Number(product.price).toLocaleString('en-IN')}
                  </span>
                )}
                {hasDiscount && (
                  <>
                    <span className="text-base text-espresso/40 line-through">₹ {Number(product.mrp).toLocaleString('en-IN')}</span>
                    <span className="text-sm font-bold text-amber bg-amber-50 px-2 py-0.5 rounded-full">{discountPct}% OFF</span>
                  </>
                )}
              </div>

              <div className="mt-2">
                <StockBadge stock={product.stock} />
              </div>
            </div>

            {product.description && (
              <div>
                <h2 className="text-sm font-semibold text-espresso mb-1">Description</h2>
                <p className="text-sm text-espresso/70 whitespace-pre-line leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.benefits && (
              <div>
                <h2 className="text-sm font-semibold text-espresso mb-1">Benefits</h2>
                <p className="text-sm text-espresso/70 whitespace-pre-line leading-relaxed">{product.benefits}</p>
              </div>
            )}

            {product.price !== null && product.price !== undefined && (
              <div className="space-y-3">
                {/* Quantity picker */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-espresso">Quantity:</span>
                  <div className="flex items-center border border-cream-200 rounded-full overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="px-4 py-2 text-sm font-semibold text-espresso hover:bg-cream disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-sm font-bold text-espresso border-x border-cream-200 min-w-[48px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      disabled={qty >= maxQty || outOfStock}
                      className="px-4 py-2 text-sm font-semibold text-espresso hover:bg-cream disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* CTA buttons — desktop */}
                <div className="hidden md:flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className={`w-full inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold transition-colors ${
                      outOfStock
                        ? 'bg-cream-200 text-espresso/40 cursor-not-allowed'
                        : added
                        ? 'bg-primary/90 text-white'
                        : 'bg-primary text-white hover:bg-primary-dark'
                    }`}
                  >
                    {outOfStock ? 'Out of Stock' : added ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${waMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
                  >
                    <WhatsAppIcon />
                    Enquire on WhatsApp
                  </a>

                  {/* Trust badges */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                    {TRUST_BADGES.map((t) => (
                      <span
                        key={t.label}
                        className="flex items-center gap-1.5 text-[11px] font-semibold"
                        style={{ color: '#A8840A' }}
                      >
                        <span>{t.icon}</span>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>

                {added && (
                  <Link to="/cart" className="hidden md:inline-flex text-xs text-primary font-semibold hover:underline">
                    View Cart →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <ReviewsSection productId={id} />

        {/* Related Products */}
        <RelatedProducts categoryId={product.category?.id} currentProductId={product.id} />
      </div>

      {/* Sticky bottom bar — mobile only */}
      {product.price !== null && product.price !== undefined && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cream-200 px-4 py-3 flex items-center gap-3 shadow-lg">
          <div className="flex-1">
            <div className="text-xs text-espresso/50">Price</div>
            <div className="text-base font-bold text-gold">₹ {Number(product.price).toLocaleString('en-IN')}</div>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${waMessage}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-[#25D366] text-white text-sm font-semibold shrink-0"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            Enquire
          </a>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`flex-1 py-3 rounded-full text-sm font-semibold transition-colors ${
              outOfStock
                ? 'bg-cream-200 text-espresso/40 cursor-not-allowed'
                : added
                ? 'bg-primary/90 text-white'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {outOfStock ? 'Out of Stock' : added ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      )}
    </>
  );
}
