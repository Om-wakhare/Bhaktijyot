import { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';

const WHATSAPP_NUMBER = '918484913170'; // change if needed

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-primary hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState({
    announcement_enabled: true,
    announcement_message: 'Authentic gemstone reports & spiritual products',
    announcement_cta_text: 'Shop Now',
    announcement_cta_link: '/products',
  });

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const res = await api.get('/site-config');
        setAnnouncement(res.data);
      } catch {
        // keep defaults
      }
    };
    loadAnnouncement();
  }, []);

  const links = useMemo(
    () => [
      { to: '/', label: 'Home' },
      { to: '/categories', label: 'Categories' },
      { to: '/products', label: 'Products' },
      { to: '/verify', label: 'Verify Certificate' },
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
    [],
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate('/products');
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40">
        {announcement.announcement_enabled && (
          <div className="bg-primary-dark text-white text-[11px] sm:text-xs">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{announcement.announcement_message}</div>
              <Link to={announcement.announcement_cta_link} className="underline font-semibold shrink-0">
                {announcement.announcement_cta_text}
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-200 text-gray-700"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              <span className="text-lg">☰</span>
            </button>

            <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                BJ
              </div>
              <div className="hidden xs:block">
                <div className="text-base font-semibold text-gray-900 font-display tracking-wide">Bhaktijyot</div>
                <div className="text-xs text-gray-500">Religious goods & gemstones</div>
              </div>
            </Link>

            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products"
                  className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/verify"
                className="px-3 py-2 rounded-full text-xs font-semibold border border-primary text-primary hover:bg-primary hover:text-white"
              >
                Verify Certificate
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-full text-xs font-semibold bg-green-500 text-white hover:bg-green-600"
              >
                WhatsApp Order
              </a>
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <nav className="flex items-center gap-2 flex-wrap">
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="sm:hidden bg-white border-b border-gray-200 shadow">
            <div className="max-w-6xl mx-auto px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/verify"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-3 py-2 rounded-md text-xs font-semibold border border-primary text-primary"
                >
                  Verify
                </Link>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center px-3 py-2 rounded-md text-xs font-semibold bg-green-500 text-white"
                >
                  WhatsApp
                </a>
              </div>
              <nav className="grid grid-cols-2 gap-2">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 border border-gray-200"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Floating WhatsApp order button */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-green-500 text-white px-4 py-2 shadow-lg hover:bg-green-600"
      >
        <span className="text-lg">🟢</span>
        <span className="text-sm font-semibold">Order on WhatsApp</span>
      </a>

      <footer className="bg-gray-900 text-gray-300 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm flex flex-col sm:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} Bhaktijyot. All rights reserved.</div>
          <div>Gemstone reports, spiritual remedies & more.</div>
        </div>
      </footer>
    </div>
  );
}

