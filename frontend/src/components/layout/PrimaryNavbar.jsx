import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/products', label: 'All Products' },
  { to: '/categories', label: 'Collections' },
  { to: '/verify', label: 'Certificates' },
  { to: '/track-order', label: 'Track Order' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function PrimaryNavbar({ scrolled }) {
  const location = useLocation();

  return (
    <nav
      className={`bg-ivory border-b border-stone-200/60 transition-all duration-200 ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="hidden lg:flex items-center justify-center gap-0">
          {LINKS.map(({ to, label, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`relative inline-flex items-center px-4 py-3.5 text-sm font-medium transition-colors group ${
                    active ? 'text-primary' : 'text-espresso/70 hover:text-espresso'
                  }`}
                >
                  {label}
                  <span
                    className={`absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full transition-transform origin-left ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
