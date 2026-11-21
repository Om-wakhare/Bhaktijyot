import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronRight, Heart, ShoppingBag } from 'lucide-react';
import api from '../../services/apiClient';
import { useCart } from '../../services/cart';
import { useWishlist } from '../../services/wishlist';
import { useSiteConfig, useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { ErrorBoundary } from '../ErrorBoundary';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import logo from '../../assets/final-logo.webp';

import { AnnouncementBar } from '../layout/AnnouncementBar';
import { LogoPillsHeader } from '../layout/LogoPillsHeader';
import { SecondaryNavbar } from '../layout/SecondaryNavbar';
import { Footer } from '../layout/Footer';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { CartDrawer } from '../layout/CartDrawer';
import { WishlistDrawer } from '../layout/WishlistDrawer';

const MOBILE_LINKS = [
  { to: '/',            label: 'Home',               exact: true },
  { to: '/products',    label: 'Shop All Products' },
  { to: '/categories',  label: 'Categories' },
  { to: '/wishlist',    label: 'Wishlist' },
  { to: '/verify',      label: 'Verify Certificate' },
  { to: '/track-order', label: 'Track My Order' },
  { to: '/about',       label: 'About Us' },
  { to: '/consult',     label: 'Consult Expert' },
  { to: '/contact',     label: 'Contact' },
];

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { config: siteConfig } = useSiteConfig();
  const whatsappNumber = useWhatsAppNumber();

  useEffect(() => {
    api.get('/categories/flat').then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  // Close the mobile menu and start each new page at the top
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Lock background scroll while the mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleMobileSearch = (e) => {
    e.preventDefault();
    const q = mobileSearch.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    setMobileSearch('');
    setMobileOpen(false);
  };

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen flex flex-col bg-cream">

      <AnnouncementBar
        text={siteConfig.announcement_message}
        linkText={siteConfig.announcement_cta_text}
        linkUrl={siteConfig.announcement_cta_link}
        isActive={siteConfig.announcement_enabled}
      />

      <div className={`sticky top-0 z-50 transition-shadow duration-200 ${scrolled ? 'shadow-md' : ''}`}>

        {/* Mobile top bar */}
        <div className="lg:hidden border-b border-espresso/10 flex items-center h-20 px-4 gap-3" style={{ backgroundColor: '#F7E7D5' }}>
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center text-espresso/70 hover:text-espresso transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="flex-1 flex justify-center">
            <img src={logo} alt="Bhaktijyot" className="h-16 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} item${wishlistCount > 1 ? 's' : ''})` : ''}`}
              className="relative h-9 w-9 flex items-center justify-center text-espresso/60 hover:text-red-500 transition-colors"
            >
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart${totalItems > 0 ? ` (${totalItems} item${totalItems > 1 ? 's' : ''})` : ''}`}
              className="relative h-9 w-9 flex items-center justify-center text-espresso/60 hover:text-espresso transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop — single combined row */}
        <div className="hidden lg:block">
          <LogoPillsHeader
            cartCount={totalItems}
            wishlistCount={wishlistCount}
            onCartOpen={() => setCartOpen(true)}
            onWishlistOpen={() => setWishlistOpen(true)}
          />
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-menu" className="lg:hidden bg-white border-b border-espresso/10 shadow-lg">
            <div className="px-4 py-3 space-y-0.5">
              {/* Mobile search */}
              <form onSubmit={handleMobileSearch} className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-espresso/40 pointer-events-none" />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Search gemstones, crystals..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-full border border-espresso/15 bg-cream text-sm text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </form>

              {MOBILE_LINKS.map((l) => {
                const active = isActive(l.to, l.exact);
                return (
                  <Link
                    key={l.to + l.label}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-espresso hover:bg-cream hover:text-primary'
                    }`}
                  >
                    {l.label}
                    <ChevronRight className={`h-4 w-4 ${active ? 'opacity-60' : 'opacity-20'}`} />
                  </Link>
                );
              })}

              <div className="pt-3 mt-1 border-t border-espresso/10 flex gap-2 px-1">
                <Link
                  to="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
                >
                  Cart {totalItems > 0 && `(${totalItems})`}
                </Link>
                <a
                  href={whatsappLink(whatsappNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <SecondaryNavbar categories={categories} />

      <main id="main-content" className="flex-1">
        {/* Page-level boundary: a crashing page shows a message instead of a blank
            site, and recovers as soon as the visitor navigates elsewhere. */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />
      <FloatingWhatsApp whatsappNumber={whatsappNumber} />

      {/* Slide-in Drawers */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </div>
  );
}
