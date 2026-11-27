import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronRight, Heart, ShoppingBag } from 'lucide-react';
import api from '../../services/apiClient';
import { useCart } from '../../services/cart';
import { useWishlist } from '../../services/wishlist';
import { useSiteConfig, useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { ErrorBoundary } from '../ErrorBoundary';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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

// Same breakpoint as Tailwind's `lg`, where the desktop header takes over
const DESKTOP_QUERY = '(min-width: 1024px)';

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

  // The menu only exists below `lg`: close it if the screen grows past that
  // (a tablet rotated to landscape, say) so no invisible modal stays open.
  useEffect(() => {
    if (!mobileOpen || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    if (mq.matches) {
      setMobileOpen(false);
      return undefined;
    }
    const onChange = (e) => { if (e.matches) setMobileOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // older Safari
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
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

        {/* Mobile top bar + slide-in menu. Radix handles the focus trap, Escape,
            background scroll lock and returning focus to the hamburger. */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <div className="lg:hidden border-b border-espresso/10 flex items-center h-20 px-4 gap-3" style={{ backgroundColor: '#F7E7D5' }}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="h-10 w-10 -ml-1 flex items-center justify-center rounded-full text-espresso/70 hover:text-espresso hover:bg-espresso/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </SheetTrigger>

            <Link to="/" className="flex-1 flex justify-center" aria-label="Bhaktijyot — home">
              <img src={logo} alt="Bhaktijyot" className="h-16 w-auto object-contain" />
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWishlistOpen(true)}
                aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} item${wishlistCount > 1 ? 's' : ''})` : ''}`}
                className="relative h-10 w-10 flex items-center justify-center rounded-full text-espresso/60 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                {wishlistCount > 0 && (
                  <span aria-hidden="true" className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label={`Cart${totalItems > 0 ? ` (${totalItems} item${totalItems > 1 ? 's' : ''})` : ''}`}
                className="relative h-10 w-10 flex items-center justify-center rounded-full text-espresso/60 hover:text-espresso transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {totalItems > 0 && (
                  <span aria-hidden="true" className="absolute top-0.5 right-0.5 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          <SheetContent
            side="left"
            hideClose
            aria-describedby={undefined}
            className="flex flex-col gap-0 p-0 w-[85vw] max-w-sm bg-ivory border-espresso/10"
          >
            {/* Header. The close button is the first focusable element, so opening
                the menu doesn't focus the search box and pop up the phone keyboard. */}
            <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-espresso/10 shrink-0">
              <SheetTitle className="font-display text-lg font-semibold text-espresso">Menu</SheetTitle>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="h-10 w-10 -mr-2 flex items-center justify-center rounded-full text-espresso/70 hover:text-espresso hover:bg-espresso/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </SheetClose>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <form role="search" onSubmit={handleMobileSearch} className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-espresso/50 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Search gemstones, crystals..."
                  aria-label="Search products"
                  enterKeyHint="search"
                  className="w-full pl-9 pr-4 py-2.5 rounded-full border border-espresso/15 bg-white text-sm text-espresso placeholder:text-espresso/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </form>

              <nav aria-label="Mobile">
                <ul className="space-y-0.5">
                  {MOBILE_LINKS.map((l) => {
                    const active = isActive(l.to, l.exact);
                    return (
                      <li key={l.to}>
                        <Link
                          to={l.to}
                          onClick={() => setMobileOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            active
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-espresso hover:bg-cream hover:text-primary'
                          }`}
                        >
                          {l.label}
                          <ChevronRight className={`h-4 w-4 ${active ? 'opacity-60' : 'opacity-25'}`} aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div
              className="shrink-0 border-t border-espresso/10 px-4 pt-3 flex gap-2"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <Link
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2.5 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Cart {totalItems > 0 && `(${totalItems})`}
              </Link>
              <a
                href={whatsappLink(whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop — single combined row */}
        <div className="hidden lg:block">
          <LogoPillsHeader
            cartCount={totalItems}
            wishlistCount={wishlistCount}
            onCartOpen={() => setCartOpen(true)}
            onWishlistOpen={() => setWishlistOpen(true)}
          />
        </div>
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
