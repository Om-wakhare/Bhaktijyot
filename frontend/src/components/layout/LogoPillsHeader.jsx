import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Heart, X } from 'lucide-react';
import logo from '../../assets/final-logo.webp';

const NAV_LINKS = [
  { to: '/',            label: 'Home',        exact: true },
  { to: '/products',    label: 'All Products' },
  { to: '/categories',  label: 'Collections' },
  { to: '/verify',      label: 'Certificates' },
  { to: '/track-order', label: 'Track Order' },
  { to: '/about',       label: 'About' },
  { to: '/consult',     label: 'Consult Expert' },
  { to: '/contact',     label: 'Contact' },
];

const ICON_BUTTON =
  'h-9 w-9 flex items-center justify-center rounded-full transition-colors relative ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function countLabel(name, count) {
  return count > 0 ? `${name} (${count} item${count > 1 ? 's' : ''})` : name;
}

/**
 * Desktop header (lg+): logo · nav · search/wishlist/cart.
 * Sizes step down between lg and xl so all eight links fit at 1024px, and the
 * search box opens as an overlay so it never pushes the nav off-screen.
 */
export function LogoPillsHeader({ cartCount = 0, wishlistCount = 0, onCartOpen, onWishlistOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const toggleRef = useRef(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setQuery('');
  }, [location.pathname]);

  const closeSearch = ({ restoreFocus = true } = {}) => {
    setSearchOpen(false);
    setQuery('');
    if (restoreFocus) toggleRef.current?.focus();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    closeSearch({ restoreFocus: false });
  };

  return (
    <div
      className="border-b border-espresso/15 px-6 xl:px-10"
      style={{
        backgroundColor: '#F7E7D5',
        WebkitTextStroke: '0.6px rgba(212,175,55,0.9)',
        paintOrder: 'stroke',
        textShadow: '0 0 10px rgba(212,175,55,0.35)',
      }}
    >
      <div className="max-w-screen-xl mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 xl:gap-6 h-28">

        {/* Logo */}
        <Link to="/" className="shrink-0" aria-label="Bhaktijyot — home">
          <img src={logo} alt="Bhaktijyot" className="h-20 xl:h-24 w-auto object-contain" />
        </Link>

        {/* Nav links — centered */}
        <nav aria-label="Main" className="flex items-center justify-center gap-0 min-w-0">
          {NAV_LINKS.map(({ to, label, exact }) => {
            const active = exact
              ? location.pathname === to
              : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex items-center px-2 xl:px-3.5 py-3.5 text-[13px] xl:text-sm font-medium transition-colors group whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded ${
                  active ? 'text-primary' : 'text-espresso/70 hover:text-espresso'
                }`}
              >
                {label}
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-2 right-2 xl:left-3.5 xl:right-3.5 h-[2px] bg-primary rounded-full transition-transform origin-left ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right — icons; the search box opens as an overlay to their left */}
        <div className="relative flex items-center gap-2 justify-end">

          {searchOpen && (
            <form
              role="search"
              onSubmit={handleSearch}
              onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
              className="absolute right-full top-1/2 -translate-y-1/2 mr-1 pl-4 py-3 flex items-center"
              style={{ backgroundColor: '#F7E7D5' }}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-espresso/50 pointer-events-none" aria-hidden="true" />
                <input
                  id="header-search"
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  enterKeyHint="search"
                  className="pl-9 pr-4 py-2 w-56 xl:w-64 rounded-full border border-espresso/25 bg-white text-sm text-espresso placeholder:text-espresso/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  style={{ WebkitTextStroke: 0, textShadow: 'none' }}
                />
              </div>
            </form>
          )}

          {/* Search toggle — opens the box, or closes it when open */}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            className={`${ICON_BUTTON} text-espresso/70 hover:text-espresso hover:bg-espresso/8`}
            aria-label={searchOpen ? 'Close search' : 'Search products'}
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? 'header-search' : undefined}
          >
            {searchOpen
              ? <X className="h-4.5 w-4.5" aria-hidden="true" />
              : <Search className="h-4.5 w-4.5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={onWishlistOpen}
            className={`${ICON_BUTTON} text-espresso/70 hover:text-red-500 hover:bg-red-50`}
            aria-label={countLabel('Wishlist', wishlistCount)}
          >
            <Heart className="h-4.5 w-4.5" aria-hidden="true" />
            {wishlistCount > 0 && (
              <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onCartOpen}
            className={`${ICON_BUTTON} text-espresso/70 hover:text-espresso hover:bg-espresso/8`}
            aria-label={countLabel('Cart', cartCount)}
          >
            <ShoppingBag className="h-4.5 w-4.5" aria-hidden="true" />
            {cartCount > 0 && (
              <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
