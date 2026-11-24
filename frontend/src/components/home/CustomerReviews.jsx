import { useState, useEffect, useId, useRef } from 'react';
import { Star, BadgeCheck, CheckCircle } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { StarRating } from '../ui/StarRating';

/* ── Shared typographic tokens (mirrors HeroSection) ── */
const GOLD = '#D4AF37';
const DARK = '#1C1209';

/* Light-bg typography — same scale as hero, adapted for ivory/white surface.
   No fontFamily here: the `font-display` class on the element sets Playfair. */
const H_PRIMARY = {
  fontSize: 'clamp(2.1rem, 3.6vw, 3.4rem)',
  lineHeight: 1.1,
  fontWeight: 700,
  color: DARK,
  textShadow: '0 0 18px rgba(212,175,55,0.45), 0 0 40px rgba(212,175,55,0.18)',
};
const H_EYEBROW = {
  color: GOLD,
  fontSize: '0.8rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
};
const H_SECONDARY = {
  color: 'rgba(28,18,9,0.70)',
  fontSize: '0.95rem',
  lineHeight: 1.7,
};

/* Card — white background, gold glowing border */
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.75)';
const GOLD_GLOW   = '0 0 10px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.2), inset 0 0 12px rgba(212,175,55,0.08)';

const CARD_H_PRIMARY = {
  fontSize: 'clamp(1.8rem, 2.8vw, 2.3rem)',
  lineHeight: 1.1,
  fontWeight: 700,
  color: DARK,
  textShadow: '0 0 18px rgba(212,175,55,0.45), 0 0 40px rgba(212,175,55,0.18)',
  marginBottom: '0.4rem',
};
const CARD_H_EYEBROW = {
  color: GOLD,
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  marginBottom: '0.6rem',
};
const CARD_H_SECONDARY = {
  color: 'rgba(28,18,9,0.65)',
  fontSize: '0.85rem',
  lineHeight: 1.6,
  marginBottom: '1.4rem',
};

const LABEL_STYLE = {
  display: 'block',
  color: 'rgba(28,18,9,0.65)',
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: '0.35rem',
};

/* Input — white bg, gold border, dark text (focus ring comes from INPUT_CLASS) */
const lightInp = {
  background: '#FFFFFF',
  border: '1.5px solid rgba(212,175,55,0.55)',
  borderRadius: 8,
  padding: '0.65rem 0.9rem',
  color: DARK,
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
};
const INPUT_CLASS = 'focus:ring-2 focus:ring-gold-400/50 transition-shadow';

const SELECT_ARROW = {
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23D4AF37' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.9rem center',
  paddingRight: '2.25rem',
};

const AVATAR_PALETTE = [
  'bg-primary/15 text-primary',
  'bg-gold-100 text-gold-800',
  'bg-amber-100 text-amber-700',
  'bg-espresso-100 text-espresso-light',
];

/* ─── helpers ─── */
function cardWidth(review) {
  const len = (review.comment || '').length + (review.title || '').length;
  if (len < 80)  return 220;
  if (len < 200) return 300;
  return 380;
}

/* ─── Scrolling Review Card ─── */
function ReviewCard({ review }) {
  const initials = review.reviewer_name
    ? review.reviewer_name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const col = AVATAR_PALETTE[initials.charCodeAt(0) % AVATAR_PALETTE.length];
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));

  return (
    <article
      className="shrink-0 bg-white rounded-[14px] px-5 py-[1.1rem] border border-espresso/8 shadow-[0_2px_10px_rgba(28,18,9,0.05)]"
      style={{ width: cardWidth(review) }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div aria-hidden="true" className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${col}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm font-semibold text-espresso truncate">{review.reviewer_name}</span>
            {review.is_verified_offline && (
              <>
                <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span className="sr-only">(verified purchase)</span>
              </>
            )}
          </div>
          <div className="flex gap-0.5 mt-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                aria-hidden="true"
                className={`h-3 w-3 ${i < rating ? 'fill-gold text-gold' : 'fill-espresso-100 text-espresso-100'}`}
              />
            ))}
          </div>
        </div>
        {review.product_name && (
          <span className="text-[9px] text-espresso/60 font-medium leading-tight text-right max-w-[70px] shrink-0">
            {review.product_name}
          </span>
        )}
      </div>
      {review.title && (
        <p className="text-sm font-semibold text-espresso mb-1">{review.title}</p>
      )}
      <p className="text-sm text-espresso/75 leading-relaxed">{review.comment}</p>
    </article>
  );
}

/** One copy of the review list. The second copy is visual only (aria-hidden, inert). */
function ReviewList({ reviews, duplicate = false }) {
  return (
    <div
      className={`flex shrink-0 items-start gap-[1.1rem] pr-[1.1rem] ${duplicate ? 'motion-reduce:hidden' : ''}`}
      aria-hidden={duplicate ? 'true' : undefined}
      ref={duplicate ? (el) => el && el.setAttribute('inert', '') : undefined}
    >
      {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
    </div>
  );
}

/* ─── Write Review Section ─── */
const EMPTY_FORM = { productId: '', name: '', rating: 5, comment: '' };

function WriteReviewSection() {
  const uid = useId();
  const [products, setProducts]       = useState([]);
  const [productsError, setProductsError] = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState('');
  const thanksRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/products/catalog', { params: { limit: 100 } })
      .then((r) => {
        if (cancelled) return;
        const list = r.data?.items || (Array.isArray(r.data) ? r.data : []);
        setProducts([...list].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      })
      .catch(() => { if (!cancelled) setProductsError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (submitted) thanksRef.current?.focus();
  }, [submitted]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId) {
      setError('Please choose the product you are reviewing.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/reviews/product/${form.productId}`, {
        reviewer_name: form.name.trim(),
        rating: form.rating,
        comment: form.comment.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your review. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setSubmitted(false); setError(''); setForm(EMPTY_FORM); };

  const ids = {
    product: `${uid}-product`,
    rating: `${uid}-rating`,
    name: `${uid}-name`,
    comment: `${uid}-comment`,
    error: `${uid}-error`,
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10 items-center mb-12">

      {/* ── Left — hero typography on ivory bg ── */}
      <div className="space-y-5">
        <p style={H_EYEBROW}>✦ Share Your Experience ✦</p>

        <h3 className="font-display" style={H_PRIMARY}>
          Loved our<br /><em>Products?</em>
        </h3>

        <p style={H_SECONDARY}>
          Your honest words help fellow seekers find the right crystal or gemstone.
          Every review is read and appreciated.
        </p>

        <ul className="flex flex-col gap-1.5 pt-1">
          {['Moderated for quality', 'Appears after approval', 'Helps the community'].map((t) => (
            <li key={t} className="flex items-center gap-2" style={{ color: 'rgba(28,18,9,0.65)', fontSize: '0.82rem' }}>
              <span aria-hidden="true" className="h-1 w-1 rounded-full inline-block shrink-0" style={{ background: GOLD }} />{t}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right — white card with gold glowing border ── */}
      <div>
        {submitted ? (
          <div className="flex flex-col items-center gap-4 text-center p-8 bg-white"
            style={{ border: GOLD_BORDER, borderRadius: '1.25rem', boxShadow: GOLD_GLOW }}>
            <div aria-hidden="true" className="h-14 w-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.10)', border: '1.5px solid rgba(212,175,55,0.45)' }}>
              <CheckCircle className="h-7 w-7" style={{ color: GOLD }} />
            </div>
            <h4 ref={thanksRef} tabIndex={-1} className="font-display focus:outline-none" style={{ ...CARD_H_PRIMARY, marginBottom: 0 }}>
              Thank you!
            </h4>
            <p style={CARD_H_SECONDARY}>
              We've received your review. It will appear on the site once our team has approved it.
            </p>
            <button type="button" onClick={reset}
              className="transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
              style={{
                padding: '0.6rem 1.4rem', borderRadius: 6,
                fontSize: '0.75rem', fontWeight: 800,
                letterSpacing: '0.13em', textTransform: 'uppercase',
                background: 'transparent', color: DARK,
                border: GOLD_BORDER, boxShadow: GOLD_GLOW,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Write another review
            </button>
          </div>
        ) : (
          <div className="bg-white" style={{ border: GOLD_BORDER, borderRadius: '1.25rem', padding: '1.75rem', boxShadow: GOLD_GLOW }}>

            <p style={CARD_H_EYEBROW}>✦ Your Review ✦</p>

            <h3 className="font-display" style={CARD_H_PRIMARY}>Write a Review</h3>

            <p style={CARD_H_SECONDARY}>
              Choose your product and share your experience. Reviews appear on the site after approval.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Product — native select: works with keyboard, screen readers and phone pickers */}
              <div>
                <label htmlFor={ids.product} style={LABEL_STYLE}>Product</label>
                <select
                  id={ids.product}
                  required
                  value={form.productId}
                  onChange={set('productId')}
                  disabled={productsError && products.length === 0}
                  className={INPUT_CLASS}
                  style={{ ...lightInp, ...SELECT_ARROW, color: form.productId ? DARK : 'rgba(28,18,9,0.60)' }}
                >
                  <option value="" disabled>
                    {productsError ? 'Products could not be loaded' : 'Select a product…'}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} style={{ color: DARK }}>{p.name}</option>
                  ))}
                </select>
                {productsError && (
                  <p style={{ fontSize: '0.72rem', color: 'rgba(28,18,9,0.65)', marginTop: '0.35rem' }}>
                    Please refresh the page to try again.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <legend id={ids.rating} style={LABEL_STYLE}>Rating</legend>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.5rem' }}>
                    <StarRating
                      value={form.rating}
                      size="md"
                      interactive
                      onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                    />
                    <span aria-live="polite" style={{ fontSize: '0.75rem', color: 'rgba(28,18,9,0.65)' }}>
                      {form.rating} of 5
                    </span>
                  </div>
                </fieldset>
                <div>
                  <label htmlFor={ids.name} style={LABEL_STYLE}>Your Name</label>
                  <input
                    id={ids.name}
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={255}
                    placeholder="e.g. Priya S."
                    value={form.name}
                    onChange={set('name')}
                    className={INPUT_CLASS}
                    style={lightInp}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={ids.comment} style={LABEL_STYLE}>Your Review</label>
                <textarea
                  id={ids.comment}
                  required
                  rows={3}
                  maxLength={3000}
                  placeholder="Share your experience with this product…"
                  value={form.comment}
                  onChange={set('comment')}
                  className={INPUT_CLASS}
                  style={{ ...lightInp, resize: 'none' }}
                />
              </div>

              {error && (
                <p id={ids.error} role="alert" style={{ fontSize: '0.78rem', color: '#B42318' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
                style={{
                  padding: '0.85rem',
                  borderRadius: 8,
                  border: GOLD_BORDER,
                  background: 'transparent',
                  boxShadow: submitting ? 'none' : GOLD_GLOW,
                  color: DARK,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/reviews/feed', { params: { limit: 12 } })
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setReviews(Array.isArray(data) ? data : data?.items || []);
      })
      .catch(() => { /* no reviews strip — the write-a-review form still works */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const items    = loading ? [] : reviews.slice(0, 12);
  const duration = `${Math.max(40, items.length * 6)}s`;

  return (
    <section className="bg-ivory py-14 lg:py-20" aria-labelledby="customer-reviews-heading">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section heading */}
        <div className="space-y-2 mb-10">
          <p style={H_EYEBROW}>✨ What People Say</p>
          <h2 id="customer-reviews-heading" className="font-display" style={H_PRIMARY}>Customer Reviews</h2>
        </div>

        <WriteReviewSection />
      </div>

      {/* Scrolling reviews (shared .bj-marquee classes; pauses on hover/focus) */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-hidden="true">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 rounded-2xl shimmer-bg" style={{ width: 260, height: 120 }} />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm py-4" style={{ color: 'rgba(28,18,9,0.60)' }}>
            No reviews yet — be the first!
          </p>
        </div>
      ) : (
        /* Focusable so keyboard users can pause it too (focus-within pauses the track) */
        <div
          className="bj-marquee bj-marquee-mask overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
          role="region"
          aria-label="Recent customer reviews"
          tabIndex={0}
        >
          <div className="bj-marquee-track" style={{ '--bj-marquee-duration': duration }}>
            <ReviewList reviews={items} />
            <ReviewList reviews={items} duplicate />
          </div>
        </div>
      )}

    </section>
  );
}
