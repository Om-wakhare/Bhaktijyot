import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '../ui/ProductCard';
import { SkeletonCard } from '../ui/SkeletonCard';
import flower from '../../assets/flower.png';

export function DiscountsSection({ products = [], loading = false, whatsappNumber, onAddToCart }) {
  const discounted = products.filter((p) => p.mrp && p.mrp > p.price);
  const items      = loading
    ? Array.from({ length: 7 }, (_, i) => ({ _sk: true, id: `sk-${i}` }))
    : (discounted.length > 0 ? discounted : products).slice(0, 12);

  if (!loading && items.length === 0) return null;

  const track    = [...items, ...items];
  const duration = `${Math.max(40, items.length * 5)}s`;

  return (
    <section className="py-14 lg:py-20" style={{ background: '#FFF8F0' }}>

      {/* ── Header — centered ── */}
      <div className="relative text-center mb-10 px-4">
        <p style={{
          color: '#C9A84C',
          fontSize: '0.72rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.40em',
          marginBottom: '0.6rem',
        }}>
          ✦ Special Offers ✦
        </p>

        <h2 style={{
          display: 'inline-block',
          color: '#1C1209',
          fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}>
          Discounts &amp; Deals
        </h2>

        {/* Lotus divider — same as Pooja Essentials */}
        <img
          src={flower}
          alt=""
          className="mx-auto mt-1 w-full max-w-[220px]"
          style={{ mixBlendMode: 'multiply' }}
        />

        {/* Shop All — right-anchored, hero button style */}
        <Link
          to="/products"
          className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 flex items-center gap-1.5 transition-all hover:scale-[1.03]"
          style={{
            fontSize: '0.68rem', fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '7px 14px', borderRadius: '5px',
            background: 'transparent',
            color: '#1C1209',
            border: '1.5px solid rgba(212,175,55,0.75)',
            boxShadow: '0 0 8px rgba(212,175,55,0.40), 0 0 18px rgba(212,175,55,0.14)',
            textDecoration: 'none',
          }}
        >
          Shop All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Infinite marquee ── */}
      <div className="ds-outer">
        <div className="ds-inner" style={{ '--ds-dur': duration }}>
          {track.map((p, i) => (
            <div key={`${p.id}-${i}`} className="ds-card">
              {p._sk
                ? <SkeletonCard />
                : <ProductCard product={p} index={i % items.length} whatsappNumber={whatsappNumber} onAddToCart={onAddToCart} />
              }
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .ds-outer {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);
                  mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);
        }
        .ds-inner {
          display: flex;
          gap: 1.25rem;
          width: max-content;
          animation: ds-scroll var(--ds-dur, 50s) linear infinite;
        }
        .ds-outer:hover .ds-inner {
          animation-play-state: paused;
        }
        .ds-card {
          flex-shrink: 0;
          width: 250px;
        }
        @media (min-width: 640px)  { .ds-card { width: 272px; } }
        @media (min-width: 1024px) { .ds-card { width: 296px; } }
        @keyframes ds-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
