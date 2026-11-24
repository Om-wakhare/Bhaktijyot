import { Link } from 'react-router-dom';
import logo from '../../assets/final-logo.webp';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { INSTAGRAM } from '../home/InstagramReels';

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

const NAV = [
  { to: '/products',    label: 'Shop' },
  { to: '/categories',  label: 'Collections' },
  { to: '/verify',      label: 'Certificates' },
  { to: '/track-order', label: 'Track Order' },
  { to: '/consult',     label: 'Consult' },
  { to: '/about',       label: 'About' },
  { to: '/contact',     label: 'Contact' },
];

const POLICIES = [
  { to: '/privacy',          label: 'Privacy Policy' },
  { to: '/terms',            label: 'Terms & Conditions' },
  { to: '/shipping-returns', label: 'Shipping, Cancellation & Refunds' },
];

export function Footer() {
  const whatsappNumber = useWhatsAppNumber();

  const socials = [
    { label: `Instagram ${INSTAGRAM.handle}`, href: INSTAGRAM.url, icon: <InstagramIcon /> },
    { label: 'Chat with us on WhatsApp', href: whatsappLink(whatsappNumber), icon: <WhatsAppIcon className="h-[18px] w-[18px]" /> },
  ];

  return (
    <footer
      style={{ backgroundColor: '#F7E7D5' }}
      className="text-espresso border-t border-espresso/10"
    >
      <div className="max-w-3xl mx-auto px-6 py-12 lg:py-14 flex flex-col items-center text-center">

        {/* Logo */}
        <Link to="/" className="inline-block" aria-label="Bhaktijyot — home">
          <img src={logo} alt="Bhaktijyot" className="h-20 w-auto object-contain" />
        </Link>

        {/* Tagline */}
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-espresso/70">
          Authentic gemstones &amp; sacred essentials, curated with devotion since 1985.
        </p>

        {/* Nav links */}
        <nav aria-label="Footer" className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {NAV.map(({ to, label }) => (
            <Link
              key={label}
              to={to}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso/75 hover:text-primary transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Social icons */}
        <div className="mt-8 flex items-center gap-6">
          {socials.map(({ label, href, icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-espresso/65 hover:text-primary transition-colors"
            >
              {icon}
            </a>
          ))}
        </div>

        {/* Thin gold divider */}
        <div
          aria-hidden="true"
          className="mt-10 mb-6 h-px w-full max-w-xs"
          style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.55), transparent)' }}
        />

        {/* Policies — required for online payments (Razorpay) */}
        <nav aria-label="Policies" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {POLICIES.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-[11px] text-espresso/70 underline-offset-2 hover:text-primary hover:underline transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom line */}
        <p className="mt-4 text-[11px] text-espresso/65">
          © {new Date().getFullYear()} Bhaktijyot · Ahilyanagar (Ahmednagar), Maharashtra, India
        </p>

      </div>
    </footer>
  );
}
