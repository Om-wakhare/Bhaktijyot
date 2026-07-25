import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import logo from '../../assets/final-logo.png';

/* ── Social links — swap # for real URLs when ready ── */
const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/bhaktijyot_gems',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/918484913170',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

const LINKS = {
  Shop: [
    { to: '/products',                 label: 'All Products' },
    { to: '/categories',               label: 'Collections' },
    { to: '/products?world=pooja',     label: 'Pooja Samagri' },
    { to: '/products?world=crystals',  label: 'Crystal World' },
    { to: '/products?world=gemstones', label: 'Gemstones' },
  ],
  Help: [
    { to: '/track-order', label: 'Track Order' },
    { to: '/verify',      label: 'Verify Certificate' },
    { to: '/consult',     label: 'Book a Consultation' },
    { to: '/contact',     label: 'Contact Us' },
  ],
  About: [
    { to: '/about', label: 'Our Story' },
    { to: '/about', label: 'Why Bhaktijyot' },
  ],
};

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#F4E4D1',
        WebkitTextStroke: '0.6px rgba(212,175,55,0.9)',
        paintOrder: 'stroke',
        textShadow: '0 0 10px rgba(212,175,55,0.35)',
      }}
      className="text-espresso/70 border-t border-espresso/15"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-5 lg:pt-10 lg:pb-6">

        {/* ── Follow Us — top center ── */}
        <div className="flex flex-col items-center mb-6 lg:mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-espresso/40 mb-3">Follow Us</p>
          <div className="flex items-center gap-2.5">
            {SOCIALS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '1px solid rgba(28,18,9,0.20)',
                  color: 'rgba(28,18,9,0.60)',
                  background: 'rgba(28,18,9,0.03)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(184,132,10,0.75)';
                  e.currentTarget.style.color = '#B8840A';
                  e.currentTarget.style.background = 'rgba(212,175,55,0.12)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(212,175,55,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(28,18,9,0.20)';
                  e.currentTarget.style.color = 'rgba(28,18,9,0.60)';
                  e.currentTarget.style.background = 'rgba(28,18,9,0.03)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">

          {/* ── Brand column ── */}
          <div className="space-y-3 lg:col-span-1">

            {/* Logo */}
            <Link to="/" className="inline-block">
              <img
                src={logo}
                alt="Bhaktijyot"
                className="h-24 lg:h-28 w-auto object-contain"
              />
            </Link>

            {/* Tagline */}
            <p className="text-xs font-medium leading-relaxed text-espresso/60">
              Authentic gemstones, crystal malas, and sacred pooja essentials — curated with devotion since 1985.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5 text-xs font-medium text-espresso/70">
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                <span>Mangal Murti Apartment, opp. Sami Ganpati, Delhi Gate, Ahilyanagar, Maharashtra</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                <a href="tel:+918484913170" className="hover:text-primary transition-colors">+91 84849 13170</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                <a href="mailto:info@bhaktijyot.com" className="hover:text-primary transition-colors">info@bhaktijyot.com</a>
              </div>
            </div>
          </div>

          {/* ── Link columns ── */}
          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title} className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/40">{title}</h3>
              <ul className="space-y-2.5">
                {items.map(({ to, label }) => (
                  <li key={label}>
                    <Link to={to} className="text-xs font-medium text-espresso/70 hover:text-primary transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider + bottom bar ── */}
        <div
          className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(28,18,9,0.15)' }}
        >
          <p className="text-[11px] font-medium text-espresso/45">
            © {new Date().getFullYear()} Bhaktijyot. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] font-medium text-espresso/40">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
            <span>·</span>
            <span>Crafted with devotion in Ahmednagar</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
