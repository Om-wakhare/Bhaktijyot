import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Heart, X } from 'lucide-react';
import logo from '../../assets/final-logo.png';

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

export function LogoPillsHeader({ cartCount = 0, wishlistCount = 0, onCartOpen, onWishlistOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setQuery('');
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <div
      className="border-b border-espresso/15 px-6 lg:px-10"
      style={{
        backgroundColor: '#F4E4D1',
        textShadow: '0 0 12px rgba(212,175,55,0.5), 0 0 28px rgba(212,175,55,0.2)',
      }}
    >
      <div className="max-w-screen-xl mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-6 h-28">

        {/* Logo */}
        <Link to="/" className="shrink-0">
          <img src={logo} alt="Bhaktijyot" className="h-24 w-auto object-contain" />
        </Link>

        {/* Nav links — centered */}
        <nav className="flex items-center justify-center gap-0">
          {NAV_LINKS.map(({ to, label, exact }) => {
            const active = exact
              ? location.pathname === to
              : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`relative inline-flex items-center px-3.5 py-3.5 text-sm font-medium transition-colors group whitespace-nowrap ${
                  active ? 'text-primary' : 'text-espresso/70 hover:text-espresso'
                }`}
              >
                {label}
                <span className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-primary rounded-full transition-transform origin-left ${
                  active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </Link>
            );
          })}
        </nav>

        {/* Right — icons + inline search */}
        <div className="flex items-center gap-2 justify-end">

          {/* Search — icon or expanded input */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-espresso/40 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-4 py-2 w-56 rounded-full border border-espresso/25 bg-white text-sm text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setQuery(''); }}
                className="h-9 w-9 flex items-center justify-center rounded-full text-espresso/50 hover:text-espresso hover:bg-espresso/8 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-full text-espresso/60 hover:text-espresso hover:bg-espresso/8 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onWishlistOpen}
            className="h-9 w-9 flex items-center justify-center rounded-full text-espresso/60 hover:text-red-500 hover:bg-red-50 transition-colors relative"
            aria-label="Wishlist"
          >
            <Heart className="h-4.5 w-4.5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onCartOpen}
            className="h-9 w-9 flex items-center justify-center rounded-full text-espresso/60 hover:text-espresso hover:bg-espresso/8 transition-colors relative"
            aria-label="Cart"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
