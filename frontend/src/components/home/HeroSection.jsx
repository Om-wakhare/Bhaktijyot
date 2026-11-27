import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, Award, Users } from 'lucide-react';
import heroImg from '../../assets/hero-section1.webp';

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

/* Hero copy. These are fixed here on purpose: Admin → Settings has no hero
   fields (the backend site-config only stores the announcement bar and the
   WhatsApp number). */
const TAG_LABEL  = '✨ Trusted by Devotees Since 1985';
const HEADING    = 'Discover the Power\nof Faith, Energy\n& Tradition';
const SUBLINE    = 'Handpicked gemstones, certified crystals, and authentic pooja essentials to enrich your spiritual path.';
const CTA_TEXT   = 'Discover Our Range';
const CTA_URL    = '/products';
const TRUST_LINE = 'Join 10,000+ families across India';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[88vh] flex items-center">

      {/* Background image (decorative — the heading carries the meaning) */}
      <img
        src={heroImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Gradient overlay. On phones the text spans the full width, so the
          overlay stays dark all the way across to keep the copy readable. */}
      <div aria-hidden="true" className="absolute inset-0 bg-espresso/70 sm:bg-transparent sm:bg-gradient-to-r sm:from-espresso/85 sm:via-espresso/55 sm:to-transparent" />

      {/* Content box — golden glittery border */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-6 sm:px-10 lg:px-16 py-16">
        <div className="max-w-lg space-y-6">

          {/* Tagline */}
          <p style={{ color: GOLD, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            {TAG_LABEL}
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
            {HEADING}
          </h1>

          {/* Subheading */}
          <p style={{ color: 'rgba(255,245,230,0.70)', fontSize: '0.95rem', lineHeight: 1.7 }}>
            {SUBLINE}
          </p>

          {/* CTA Buttons — off-white text + golden glittery border */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link
              to={CTA_URL}
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
              {CTA_TEXT}
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
          <p style={{ color: 'rgba(255,245,230,0.62)', fontSize: '0.72rem', fontWeight: 500 }}>
            {TRUST_LINE}
          </p>

          {/* Trust badges */}
          <ul
            className="flex items-center gap-6 pt-4"
            style={{ borderTop: '1px solid rgba(212,175,55,0.22)' }}
          >
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <div
                  aria-hidden="true"
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    border: '1px solid rgba(212,175,55,0.45)',
                    background: 'rgba(212,175,55,0.08)',
                    boxShadow: '0 0 6px rgba(212,175,55,0.2)',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: GOLD }} />
                </div>
                {/* Icon-only on phones, but the label stays readable by screen readers */}
                <span
                  className="text-[10px] font-semibold leading-tight sr-only sm:not-sr-only sm:block"
                  style={{ color: 'rgba(255,245,230,0.72)' }}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </section>
  );
}
