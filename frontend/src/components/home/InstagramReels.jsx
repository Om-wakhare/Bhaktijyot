import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import api from '../../services/apiClient';

/** The shop's Instagram account — single source of truth (Footer and Contact reuse it). */
export const INSTAGRAM = {
  handle: '@bhaktijyot_gems',
  url: 'https://www.instagram.com/bhaktijyot_gems/',
};

/** Outline Instagram glyph. Decorative — label the surrounding link instead. */
export function IgIcon({ style, className }) {
  return (
    <svg
      style={style}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function ReelCard({ reel }) {
  const [hover, setHover] = useState(false);

  const caption = reel.caption
    ? reel.caption.replace(/#\w+/g, '').trim().slice(0, 80) + (reel.caption.length > 80 ? '…' : '')
    : '';

  return (
    <a
      href={reel.permalink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${caption || 'Instagram reel'} (opens Instagram in a new tab)`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8F0]"
      style={{
        display: 'block',
        position: 'relative',
        aspectRatio: '9/16',
        borderRadius: '0.875rem',
        overflow: 'hidden',
        border: hover ? '2px solid #C9A84C' : '2px solid transparent',
        boxShadow: hover
          ? '0 12px 40px rgba(201,168,76,0.30), 4px 4px 0 #1C1209'
          : '0 4px 16px rgba(28,18,9,0.12)',
        transition: 'border 0.22s, box-shadow 0.22s, transform 0.22s',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        background: '#1C1209',
      }}
    >
      {/* Thumbnail */}
      {reel.thumbnail_url && (
        <img
          src={reel.thumbnail_url}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
          }}
        />
      )}

      {/* Dark gradient overlay */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: hover
          ? 'linear-gradient(to top, rgba(28,18,9,0.88) 0%, rgba(28,18,9,0.20) 55%, transparent 100%)'
          : 'linear-gradient(to top, rgba(28,18,9,0.60) 0%, transparent 60%)',
        transition: 'background 0.25s',
      }} />

      {/* Play button */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hover ? 1 : 0.75,
        transition: 'opacity 0.22s',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: hover
            ? 'linear-gradient(135deg, #C9A84C, #A07830)'
            : 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: hover ? '0 4px 20px rgba(201,168,76,0.50)' : '0 2px 12px rgba(0,0,0,0.30)',
          transition: 'background 0.22s, box-shadow 0.22s',
        }}>
          <Play style={{ width: 18, height: 18, fill: '#1C1209', color: '#1C1209', marginLeft: 2 }} />
        </div>
      </div>

      {/* Caption on hover / keyboard focus (the link's aria-label already carries it) */}
      {caption && (
        <p aria-hidden="true" style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0.75rem',
          color: 'rgba(255,248,240,0.90)', fontSize: '0.72rem', lineHeight: 1.45,
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.22s, transform 0.22s',
          margin: 0,
        }}>
          {caption}
        </p>
      )}
    </a>
  );
}

function SkeletonReel() {
  return <div className="shimmer-bg" style={{ aspectRatio: '9/16', borderRadius: '0.875rem' }} />;
}

export function InstagramReels() {
  const [reels, setReels]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/instagram')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        // Only keep reels we can actually link to
        setReels(list.filter((r) => typeof r?.permalink === 'string' && r.permalink.startsWith('https://')));
      })
      // 503 = Instagram not configured yet; any error simply hides the section
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Don't render the section at all if there's an error or nothing to show
  if (!loading && (failed || reels.length === 0)) return null;

  return (
    <section
      aria-labelledby="instagram-heading"
      aria-busy={loading ? 'true' : undefined}
      style={{ background: '#FFF8F0', padding: 'clamp(3.5rem,7vw,5.5rem) 0' }}
    >
      <div style={{ maxWidth: '90rem', margin: '0 auto', padding: '0 1.25rem' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem,4vw,3rem)' }}>
          <p style={{
            color: '#C9A84C', fontSize: '0.68rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.40em', marginBottom: '0.6rem',
          }}>
            ✦ Follow Our Journey ✦
          </p>

          <h2 id="instagram-heading" style={{
            display: 'inline-block',
            color: '#1C1209',
            fontSize: 'clamp(1.75rem,3.5vw,2.4rem)',
            fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.15,
            paddingBottom: '0.55rem',
            borderBottom: '1.5px solid transparent',
            borderImage: 'linear-gradient(90deg, transparent, #C9A84C 25%, #C9A84C 75%, transparent) 1',
            marginBottom: '0.75rem',
          }}>
            On Instagram
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a
              href={INSTAGRAM.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                color: '#7A5C3B', fontSize: '0.8rem', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <IgIcon style={{ width: 14, height: 14 }} />
              {INSTAGRAM.handle}
            </a>
          </div>
        </div>

        {/* ── Reel grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 'clamp(0.75rem,2vw,1.25rem)',
        }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonReel key={i} />)
            : reels.map((r) => <ReelCard key={r.id} reel={r} />)
          }
        </div>

        {/* ── Follow CTA ── */}
        {!loading && reels.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 'clamp(2rem,4vw,2.75rem)' }}>
            <a
              href={INSTAGRAM.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #C9A84C 0%, #A07830 100%)',
                color: '#1C1209', fontWeight: 700, fontSize: '0.82rem',
                textTransform: 'uppercase', letterSpacing: '0.14em',
                padding: '0.85rem 2.2rem', borderRadius: 999,
                border: '2px solid #1C1209',
                boxShadow: '3px 3px 0 #1C1209',
                textDecoration: 'none',
              }}
            >
              <IgIcon style={{ width: 15, height: 15 }} />
              Follow on Instagram
            </a>
          </div>
        )}

      </div>
    </section>
  );
}
