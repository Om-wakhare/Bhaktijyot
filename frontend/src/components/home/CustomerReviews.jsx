import { useState, useEffect, useRef } from 'react';
import { Star, BadgeCheck, CheckCircle, PenLine, Search, X } from 'lucide-react';
import api from '../../services/apiClient';
import { StarRating } from '../ui/StarRating';

/* ── Shared typographic tokens (mirrors HeroSection) ── */
const GOLD = '#D4AF37';
const DARK = '#1C1209';

/* Light-bg typography — same scale as hero, adapted for ivory/white surface */
const H_PRIMARY = {
  fontFamily: 'inherit',
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
  color: 'rgba(28,18,9,0.65)',
  fontSize: '0.95rem',
  lineHeight: 1.7,
};

/* Card — white background, gold glowing border */
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.75)';
const GOLD_GLOW   = '0 0 10px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.2), inset 0 0 12px rgba(212,175,55,0.08)';

const CARD_H_PRIMARY = {
  fontFamily: 'inherit',
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
  color: 'rgba(28,18,9,0.50)',
  fontSize: '0.85rem',
  lineHeight: 1.6,
  marginBottom: '1.4rem',
};

/* Input — white bg, gold border, dark text */
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

/* ─── helpers ─── */
function cardWidth(comment = '') {
  const len = comment.length;
  if (len < 80)  return 220;
  if (len < 200) return 300;
  return 380;
}

/* ─── Scrolling Review Card ─── */
function ReviewCard({ review }) {
  const initials = review.reviewer_name
    ? review.reviewer_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const palette = [
    'bg-primary/15 text-primary',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-stone-100 text-stone-600',
  ];
  const col = palette[initials.charCodeAt(0) % palette.length];

  return (
    <div className="rv-card" style={{ width: cardWidth(review.comment), flexShrink: 0 }}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${col}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm font-semibold text-espresso truncate">{review.reviewer_name}</span>
            {review.is_verified_offline && <BadgeCheck className="h-3.5 w-3.5 text-teal-500 shrink-0" />}
          </div>
          <div className="flex gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < (review.rating || 5) ? 'fill-gold text-gold' : 'fill-stone-200 text-stone-200'}`} />
            ))}
          </div>
        </div>
        {review.product_name && (
          <span className="text-[9px] text-espresso/35 font-medium leading-tight text-right max-w-[70px] shrink-0">
            {review.product_name}
          </span>
        )}
      </div>
      <p className="text-sm text-espresso/70 leading-relaxed">{review.comment}</p>
    </div>
  );
}

/* ─── Product search ─── */
function ProductSearch({ products, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef(null);

  const matches = query.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    function onClickOut(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  function pick(p) { setQuery(p.name); setOpen(false); onSelect(p.id); }
  function clear()  { setQuery(''); onSelect(''); }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'rgba(212,175,55,0.70)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onSelect(''); }}
          onFocus={() => { if (query.length > 0) setOpen(true); }}
          placeholder="Search product…"
          autoComplete="off"
          style={{ ...lightInp, paddingLeft: '2.2rem', paddingRight: query ? '2rem' : undefined }}
        />
        {query && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(28,18,9,0.35)' }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-30 top-full mt-1 left-0 right-0 rounded-xl overflow-hidden bg-white"
          style={{ border: GOLD_BORDER, boxShadow: GOLD_GLOW }}>
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => pick(p)}
                className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                style={{ color: DARK, background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.length > 1 && matches.length === 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 rounded-xl px-3 py-3 text-xs bg-white"
          style={{ border: GOLD_BORDER, color: 'rgba(28,18,9,0.40)' }}>
          No products found
        </div>
      )}
    </div>
  );
}

/* ─── Write Review Section ─── */
function WriteReviewSection() {
  const [products, setProducts]     = useState([]);
  const [productId, setProductId]   = useState('');
  const [form, setForm]             = useState({ name: '', rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    api.get('/products/catalog', { params: { limit: 100 } })
      .then((r) => setProducts(r.data?.items || r.data || []))
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/reviews/product/${productId}`, {
        reviewer_name: form.name,
        rating: form.rating,
        comment: form.comment,
      });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setSubmitted(false); setProductId(''); setForm({ name: '', rating: 5, comment: '' }); };

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

        <div className="flex flex-col gap-1.5 pt-1">
          {['Moderated for quality', 'Appears after approval', 'Helps the community'].map((t) => (
            <span key={t} className="flex items-center gap-2" style={{ color: 'rgba(28,18,9,0.45)', fontSize: '0.82rem' }}>
              <span className="h-1 w-1 rounded-full inline-block shrink-0" style={{ background: GOLD }} />{t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right — white card with gold glowing border ── */}
      <div>
        {submitted ? (
          <div className="flex flex-col items-center gap-4 text-center p-8 bg-white"
            style={{ border: GOLD_BORDER, borderRadius: '1.25rem', boxShadow: GOLD_GLOW }}>
            <div className="h-14 w-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.10)', border: '1.5px solid rgba(212,175,55,0.45)' }}>
              <CheckCircle className="h-7 w-7" style={{ color: GOLD }} />
            </div>
            <h4 className="font-display" style={{ ...CARD_H_PRIMARY, marginBottom: 0 }}>Thank you!</h4>
            <p style={CARD_H_SECONDARY}>Your review will appear after approval.</p>
            <button type="button" onClick={reset}
              className="transition-all hover:scale-[1.02]"
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

            <p style={CARD_H_SECONDARY}>Search for your product and share your experience</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <ProductSearch products={products} onSelect={setProductId} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ color: 'rgba(28,18,9,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Rating
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '2.5rem' }}>
                    <StarRating
                      value={form.rating}
                      size="md"
                      interactive
                      onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ color: 'rgba(28,18,9,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Your Name
                  </label>
                  <input type="text" required placeholder="e.g. Priya S." value={form.name} onChange={set('name')} style={lightInp} />
                </div>
              </div>

              <textarea
                required
                rows={3}
                placeholder="Share your experience with this product…"
                value={form.comment}
                onChange={set('comment')}
                style={{ ...lightInp, resize: 'none' }}
              />

              {error && <p style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</p>}

              <button
                type="submit"
                disabled={submitting || !productId}
                className="transition-all hover:scale-[1.02]"
                style={{
                  padding: '0.85rem',
                  borderRadius: 8,
                  border: GOLD_BORDER,
                  background: 'transparent',
                  boxShadow: submitting || !productId ? 'none' : GOLD_GLOW,
                  color: DARK,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  cursor: submitting || !productId ? 'not-allowed' : 'pointer',
                  opacity: submitting || !productId ? 0.5 : 1,
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
export function CustomerReviews({ reviews = [], loading = false }) {
  const items    = loading ? [] : reviews.slice(0, 12);
  const track    = items.length > 0 ? [...items, ...items] : [];
  const duration = `${Math.max(40, items.length * 6)}s`;

  return (
    <section className="bg-ivory py-14 lg:py-20">

      <style>{`
        .rv-outer {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%);
                  mask-image: linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%);
        }
        .rv-track {
          display: flex;
          align-items: flex-start;
          gap: 1.1rem;
          width: max-content;
          animation: rv-scroll var(--rv-dur, 48s) linear infinite;
        }
        .rv-outer:hover .rv-track { animation-play-state: paused; }
        @keyframes rv-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .rv-card {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 1.1rem 1.25rem;
          border: 1px solid rgba(28,18,9,0.07);
          box-shadow: 0 2px 10px rgba(28,18,9,0.05);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section heading */}
        <div className="space-y-2 mb-10">
          <p style={H_EYEBROW}>✨ What People Say</p>
          <h2 className="font-display" style={H_PRIMARY}>Customer Reviews</h2>
        </div>

        <WriteReviewSection />
      </div>

      {/* Scrolling reviews */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 rounded-2xl shimmer-bg" style={{ width: 260, height: 120 }} />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm py-4" style={{ color: 'rgba(28,18,9,0.35)' }}>
            No reviews yet — be the first!
          </p>
        </div>
      ) : (
        <div className="rv-outer">
          <div className="rv-track" style={{ '--rv-dur': duration }}>
            {track.map((r, i) => (
              <ReviewCard key={`${r.id}-${i}`} review={r} />
            ))}
          </div>
        </div>
      )}

    </section>
  );
}
