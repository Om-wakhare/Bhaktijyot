import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

function IgIcon({ style }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
import api from '../../services/apiClient';

const IG_HANDLE = '@bhaktijyot_gems';
const IG_URL    = 'https://www.instagram.com/bhaktijyot_gems/';

function ReelCard({ reel, index }) {
  const [hover, setHover] = useState(false);

  const caption = reel.caption
    ? reel.caption.replace(/#\w+/g, '').trim().slice(0, 80) + (reel.caption.length > 80 ? '…' : '')
    : '';

  return (
    <a
      href={reel.permalink}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Thumbnail */}
      {reel.thumbnail_url && (
        <img
          src={reel.thumbnail_url}
          alt={caption || 'Instagram reel'}
          loading="lazy"
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
      <div style={{
        position: 'absolute', inset: 0,
        background: hover
          ? 'linear-gradient(to top, rgba(28,18,9,0.88) 0%, rgba(28,18,9,0.20) 55%, transparent 100%)'
          : 'linear-gradient(to top, rgba(28,18,9,0.60) 0%, transparent 60%)',
        transition: 'background 0.25s',
      }} />

      {/* Play button */}
      <div style={{
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
          <Play style={{
            width: 18, height: 18,
            fill: hover ? '#1C1209' : '#1C1209',
            color: hover ? '#1C1209' : '#1C1209',
            marginLeft: 2,
          }} />
        </div>
      </div>

      {/* Caption on hover */}
      {caption && (
        <p style={{
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
  return (
    <div style={{
      aspectRatio: '9/16', borderRadius: '0.875rem',
      background: 'linear-gradient(110deg, #EAD9C4 30%, #F4E4D1 50%, #EAD9C4 70%)',
      backgroundSize: '200% 100%',
      animation: 'ig-shimmer 1.4s infinite linear',
    }} />
  );
}

export function InstagramReels() {
  const [reels, setReels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/instagram')
      .then((res) => setReels(res.data?.reels || []))
      .catch(() => setError('Could not load reels right now.'))
      .finally(() => setLoading(false));
  }, []);

  // Don't render section at all if there's an error (token not set yet, etc.)
  if (!loading && (error || reels.length === 0)) return null;

  return (
    <section style={{ background: '#FFF8F0', padding: 'clamp(3.5rem,7vw,5.5rem) 0' }}>
      <style>{`
        @keyframes ig-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ maxWidth: '90rem', margin: '0 auto', padding: '0 1.25rem' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem,4vw,3rem)' }}>
          <p style={{
            color: '#C9A84C', fontSize: '0.68rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.40em', marginBottom: '0.6rem',
          }}>
            ✦ Follow Our Journey ✦
          </p>

          <h2 style={{
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
              href={IG_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                color: '#8B5E0A', fontSize: '0.8rem', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <IgIcon style={{ width: 14, height: 14 }} />
              {IG_HANDLE}
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
            : reels.map((r, i) => <ReelCard key={r.id} reel={r} index={i} />)
          }
        </div>

        {/* ── Follow CTA ── */}
        {!loading && reels.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 'clamp(2rem,4vw,2.75rem)' }}>
            <a
              href={IG_URL}
              target="_blank"
              rel="noreferrer"
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
