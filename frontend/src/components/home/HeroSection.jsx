import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, Award, Users } from 'lucide-react';
import { mediaUrl } from '../../services/media';
import heroImg from '../../assets/hero-section1.png';

const TRUST_BADGES = [
  { icon: BadgeCheck, label: 'Lab Certified' },
  { icon: ShieldCheck, label: 'Free Certificate' },
  { icon: Award,       label: '40+ Years Trust' },
  { icon: Users,       label: '10,000+ Families' },
];

const GOLD_GLOW   = '0 0 10px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.2), inset 0 0 12px rgba(212,175,55,0.08)';
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.75)';
const OFF_WHITE   = '#FFF5E6';
const GOLD        = '#D4AF37';

export function HeroSection({
  tagLabel  = '✨ Trusted by Devotees Since 1985',
  heading   = 'Discover the Power\nof Faith, Energy\n& Tradition',
  subline   = 'Handpicked gemstones, certified crystals, and authentic pooja essentials to enrich your spiritual path.',
  ctaText   = 'Discover Our Range',
  ctaUrl    = '/products',
  heroImage = null,
  trustLine = 'Join 10,000+ families across India',
}) {
  const bg = heroImage ? mediaUrl(heroImage) : heroImg;

  return (
    <section className="relative overflow-hidden min-h-[88vh] flex items-center">

      {/* Background image */}
      <img
        src={bg}
        alt="Bhaktijyot"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-espresso/85 via-espresso/55 to-transparent" />

      {/* Content box — golden glittery border */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-6 sm:px-10 lg:px-16 py-16">
        <div className="max-w-lg space-y-6">

          {/* Tagline */}
          <p style={{ color: GOLD, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            {tagLabel}
          </p>

          {/* Heading — off-white with gold glitter glow on the text */}
          <h1
            className="font-display font-bold whitespace-pre-line"
            style={{
              fontSize: 'clamp(2.1rem, 3.6vw, 3.4rem)',
              lineHeight: 1.1,
              color: OFF_WHITE,
              textShadow: `0 0 8px rgba(212,175,55,0.6), 0 0 20px rgba(212,175,55,0.3), 0 2px 12px rgba(0,0,0,0.5)`,
            }}
          >
            {heading}
          </h1>

          {/* Subheading */}
          <p style={{ color: 'rgba(255,245,230,0.70)', fontSize: '0.95rem', lineHeight: 1.7 }}>
            {subline}
          </p>

          {/* CTA Buttons — off-white text + golden glittery border */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link
              to={ctaUrl}
              className="inline-flex items-center justify-center px-9 py-3.5 text-sm font-bold uppercase tracking-[0.12em] transition-all hover:scale-[1.02]"
              style={{
                borderRadius: '4px',
                color: OFF_WHITE,
                background: 'rgba(15,8,2,0.35)',
                border: GOLD_BORDER,
                boxShadow: GOLD_GLOW,
                textShadow: `0 0 8px rgba(212,175,55,0.4)`,
              }}
            >
              {ctaText}
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center justify-center px-9 py-3.5 text-sm font-bold uppercase tracking-[0.12em] transition-all hover:scale-[1.02]"
              style={{
                borderRadius: '4px',
                color: OFF_WHITE,
                background: 'rgba(15,8,2,0.2)',
                border: '1.5px solid rgba(212,175,55,0.4)',
                boxShadow: '0 0 8px rgba(212,175,55,0.15)',
              }}
            >
              Verify Certificate
            </Link>
          </div>

          {/* Trust line */}
          {trustLine && (
            <p style={{ color: 'rgba(255,245,230,0.40)', fontSize: '0.72rem', fontWeight: 500 }}>
              {trustLine}
            </p>
          )}

          {/* Trust badges */}
          <div
            className="flex items-center gap-6 pt-4"
            style={{ borderTop: '1px solid rgba(212,175,55,0.22)' }}
          >
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    border: '1px solid rgba(212,175,55,0.45)',
                    background: 'rgba(212,175,55,0.08)',
                    boxShadow: '0 0 6px rgba(212,175,55,0.2)',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: GOLD }} />
                </div>
                <span
                  className="text-[10px] font-semibold leading-tight hidden sm:block"
                  style={{ color: 'rgba(255,245,230,0.55)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
