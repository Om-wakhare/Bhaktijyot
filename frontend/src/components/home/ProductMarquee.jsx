import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../../services/apiClient';
import { useCart } from '../../services/cart';
import { ProductCard } from '../ui/ProductCard';
import { SkeletonCard } from '../ui/SkeletonCard';
import flower from '../../assets/flower.webp';

const SKELETON_COUNT = 7;

const EYEBROW_STYLE = {
  color: '#C9A84C',
  fontSize: '0.72rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.40em',
  marginBottom: '0.6rem',
};

const HEADING_STYLE = {
  display: 'inline-block',
  color: '#1C1209',
  fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  lineHeight: 1.15,
};

/* Hero-style button: gold glowing border, no fill */
const VIEW_ALL_STYLE = {
  fontSize: '0.68rem', fontWeight: 800,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  padding: '7px 14px', borderRadius: '5px',
  background: 'transparent',
  color: '#1C1209',
  border: '1.5px solid rgba(212,175,55,0.75)',
  boxShadow: '0 0 8px rgba(212,175,55,0.40), 0 0 18px rgba(212,175,55,0.14)',
  textDecoration: 'none',
};

/** The duplicated marquee copy is purely visual: hide it from screen readers and keyboard. */
function makeInert(el) {
  if (el) el.setAttribute('inert', '');
}

function MarqueeCopy({ items, onAddToCart, duplicate = false }) {
  return (
    <ul
      className={`flex shrink-0 gap-5 pr-5 ${duplicate ? 'motion-reduce:hidden' : ''}`}
      aria-hidden={duplicate ? 'true' : undefined}
      ref={duplicate ? makeInert : undefined}
    >
      {items.map((p, i) => (
        <li key={p.id} className="shrink-0 w-[250px] sm:w-[272px] lg:w-[296px]">
          {p._sk
            ? <SkeletonCard />
            : <ProductCard product={p} index={i} onAddToCart={onAddToCart} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * Home-page product strip: centered heading + lotus divider + "View all" link,
 * then an infinite marquee of product cards. Fetches its own list from
 * /products/catalog and renders nothing when the list comes back empty.
 *
 * Props:
 *   id          — unique id prefix (used for aria-labelledby)
 *   eyebrow     — small gold label above the heading
 *   title       — section heading
 *   viewAllTo / viewAllLabel — the link shown beside/below the heading
 *   params      — query params for GET /products/catalog (keep the object stable)
 *   filter      — optional client-side predicate applied to the fetched items
 *   maxItems    — how many cards to show (default 12)
 *   showSkeleton — show placeholder cards while loading (default true). Turn it
 *                  off for sections that are often empty, so the page doesn't
 *                  show a block of skeletons that then collapses.
 */
export function ProductMarquee({
  id,
  eyebrow,
  title,
  viewAllTo = '/products',
  viewAllLabel = 'View All',
  params,
  filter,
  maxItems = 12,
  showSkeleton = true,
}) {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const paramsKey = JSON.stringify(params || {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/products/catalog', { params: JSON.parse(paramsKey) })
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setProducts(Array.isArray(data) ? data : data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]); // section hides itself
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  const list = (filter ? products.filter(filter) : products).slice(0, maxItems);

  if (loading && !showSkeleton) return null;
  if (!loading && list.length === 0) return null;

  const items = loading
    ? Array.from({ length: SKELETON_COUNT }, (_, i) => ({ _sk: true, id: `sk-${i}` }))
    : list;
  const duration = `${Math.max(40, items.length * 5)}s`;
  const headingId = `${id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={loading ? 'true' : undefined}
      className="py-14 lg:py-20"
      style={{ background: '#FFF8F0' }}
    >
      {/* ── Header — centered; "View all" sits below the divider on small
             screens and moves to the right edge only on wide screens, where
             the side padding keeps it clear of the heading ── */}
      <div className="relative text-center mb-10 px-4 lg:px-44">
        <p style={EYEBROW_STYLE}>{eyebrow}</p>

        <h2 id={headingId} style={HEADING_STYLE}>
          {title}
        </h2>

        {/* Lotus divider */}
        <img
          src={flower}
          alt=""
          className="mx-auto mt-1 w-full max-w-[220px]"
          style={{ mixBlendMode: 'multiply' }}
        />

        <Link
          to={viewAllTo}
          className="mt-4 inline-flex items-center gap-1.5 transition-all hover:scale-[1.03] lg:mt-0 lg:absolute lg:right-8 lg:top-1/2 lg:-translate-y-1/2"
          style={VIEW_ALL_STYLE}
        >
          {viewAllLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* ── Infinite marquee (shared .bj-marquee classes; pauses on hover/focus) ── */}
      <div className="bj-marquee bj-marquee-mask overflow-hidden">
        <div className="bj-marquee-track" style={{ '--bj-marquee-duration': duration }}>
          <MarqueeCopy items={items} onAddToCart={addItem} />
          <MarqueeCopy items={items} onAddToCart={addItem} duplicate />
        </div>
      </div>
    </section>
  );
}
