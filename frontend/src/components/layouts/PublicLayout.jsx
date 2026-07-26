import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronRight, Heart, ShoppingBag } from 'lucide-react';
import api from '../../services/apiClient';
import { useCart } from '../../services/cart';
import { useWishlist } from '../../services/wishlist';
import logo from '../../assets/final-logo.png';

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

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
  const [siteConfig, setSiteConfig] = useState({
    announcement_enabled: true,
    announcement_message: '40+ Years of Authentic Gemstones & Sacred Essentials — Free Certificate with Every Gemstone',
    announcement_cta_text: 'Shop Now',
    announcement_cta_link: '/products',
    whatsapp_number: '918484913170',
  });

  const whatsappNumber = siteConfig.whatsapp_number || '918484913170';

  useEffect(() => {
    api.get('/site-config').then((res) => setSiteConfig(res.data)).catch(() => {});
    api.get('/categories/flat').then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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
        <div className="lg:hidden border-b border-espresso/10 flex items-center h-20 px-4 gap-3" style={{ backgroundColor: '#F4E4D1' }}>
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
                  href={`https://wa.me/${whatsappNumber}`}
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

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <FloatingWhatsApp whatsappNumber={whatsappNumber} />

      {/* Slide-in Drawers */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </div>
  );
}
