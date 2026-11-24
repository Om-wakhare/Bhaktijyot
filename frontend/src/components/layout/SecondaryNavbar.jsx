import { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import img1 from '../../assets/secondarynavimg1.webp';
import img2 from '../../assets/secondarynavimg2.webp';
import img3 from '../../assets/secondarynavimg3.webp';

/* `key` must match the category "world" values assigned in Admin → Categories */
const WORLDS = [
  {
    key:   'pooja',
    label: 'Pooja Samagri',
    sub:   'Sacred essentials for daily rituals',
    cta:   'Shop Now',
    to:    '/products?world=pooja',
    image: img1,
  },
  {
    key:   'crystals',
    label: 'Crystal World',
    sub:   'Healing crystals, certified & authentic',
    cta:   'Explore',
    to:    '/products?world=crystals',
    image: img2,
  },
  {
    key:   'gemstones',
    label: 'Gemstones',
    sub:   'Lab-certified precious gemstones',
    cta:   'View Gems',
    to:    '/products?world=gemstones',
    image: img3,
  },
];

const MAX_MENU_ITEMS = 8;

// Literal class names so Tailwind keeps them: places the dropdown under its tile on md+
const COL_START = ['md:col-start-1', 'md:col-start-2', 'md:col-start-3'];

function WorldTile({ world, hasCategories, isOpen, isActive, menuId, onToggle, toggleRef }) {
  const navigate = useNavigate();

  // Clicking the picture: open the category list, or go straight to the world
  // when it has no categories yet. (Keyboard users use the link / chevron.)
  const handleTileClick = () => {
    if (hasCategories) onToggle({ focusMenu: false });
    else navigate(world.to);
  };

  return (
    <li className="shrink-0 w-[72vw] max-w-[280px] snap-start md:w-auto md:max-w-none">
      <div
        className="relative overflow-hidden rounded-2xl h-20 md:h-32 cursor-pointer group"
        onClick={handleTileClick}
        style={isActive ? { outline: '3px solid #1D3D2C', outlineOffset: '2px' } : undefined}
      >
        <img
          src={world.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Text sits on the cream/right portion of the image */}
        <div className="absolute inset-0 flex flex-col justify-center items-end pr-4 md:pr-5 pl-[40%]">
          <div className="text-right">
            <span className="block font-display text-sm md:text-base font-bold text-espresso leading-tight">
              {world.label}
            </span>

            <div className="mt-1 md:mt-2 flex items-center justify-end gap-1.5">
              <Link
                to={world.to}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {world.cta}<span className="sr-only"> — {world.label}</span> <span aria-hidden="true">→</span>
              </Link>
              {hasCategories && (
                <button
                  ref={toggleRef}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle({ focusMenu: true }); }}
                  aria-label={`${world.label} categories`}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? menuId : undefined}
                  className="h-7 w-7 md:h-6 md:w-6 flex items-center justify-center rounded-full hover:bg-espresso/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 text-espresso/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active ring */}
        {(isOpen || isActive) && (
          <div aria-hidden="true" className="absolute inset-0 rounded-2xl ring-2 ring-primary pointer-events-none" />
        )}

        {/* Active badge */}
        {isActive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
            Browsing
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * The three "worlds" (Pooja / Crystals / Gemstones). Each tile links to
 * /products?world=<key>; the chevron opens that world's categories.
 * Phones/tablets: one compact horizontally-scrolling row. md+: three columns.
 */
export function SecondaryNavbar({ categories = [] }) {
  const uid = useId();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [openKey, setOpenKey] = useState(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const toggleRefs = useRef({});
  const focusMenuOnOpen = useRef(false);

  const activeWorld = location.pathname === '/products' ? searchParams.get('world') || '' : '';

  const catsByWorld = useMemo(() => {
    const map = {};
    for (const w of WORLDS) map[w.key] = [];
    for (const c of categories) {
      if (c && map[c.world]) map[c.world].push(c);
    }
    return map;
  }, [categories]);

  const menuId = (key) => `${uid}-menu-${key}`;

  const toggle = (key, { focusMenu = false } = {}) => {
    const next = openKey === key ? null : key;
    focusMenuOnOpen.current = Boolean(next) && focusMenu;
    setOpenKey(next);
  };

  const close = () => setOpenKey(null);

  // Close on navigation
  useEffect(() => {
    setOpenKey(null);
  }, [location.pathname, location.search]);

  // When opened from the chevron button, move focus to the first category
  useEffect(() => {
    if (openKey && focusMenuOnOpen.current) {
      focusMenuOnOpen.current = false;
      menuRef.current?.querySelector('a')?.focus();
    }
  }, [openKey]);

  // Close on outside click / tap and on Escape
  useEffect(() => {
    if (!openKey) return undefined;
    const onPointer = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenKey(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenKey(null);
        toggleRefs.current[openKey]?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey]);

  // Close when keyboard focus moves somewhere outside the navbar
  const handleBlur = (e) => {
    if (openKey && e.relatedTarget && !containerRef.current?.contains(e.relatedTarget)) {
      setOpenKey(null);
    }
  };

  // Up/Down arrows move between the links in the open list
  const handleMenuKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(menuRef.current?.querySelectorAll('a') || []);
    if (links.length === 0) return;
    e.preventDefault();
    const i = links.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown'
      ? links[(i + 1) % links.length]
      : links[(i - 1 + links.length) % links.length];
    next.focus();
  };

  const openIndex = WORLDS.findIndex((w) => w.key === openKey);
  const openWorld = openIndex >= 0 ? WORLDS[openIndex] : null;
  const openCats = openWorld ? catsByWorld[openWorld.key] : [];

  return (
    <nav
      aria-label="Shop by world"
      className="border-b border-espresso/10 py-3 md:py-4 px-4 sm:px-6 lg:px-10"
      style={{ backgroundColor: '#F7E7D5' }}
    >
      <div ref={containerRef} className="relative max-w-screen-xl mx-auto" onBlur={handleBlur}>
        <ul
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible"
          style={{ scrollbarWidth: 'none' }}
        >
          {WORLDS.map((world) => (
            <WorldTile
              key={world.key}
              world={world}
              hasCategories={catsByWorld[world.key].length > 0}
              isOpen={openKey === world.key}
              isActive={activeWorld === world.key}
              menuId={menuId(world.key)}
              onToggle={(opts) => toggle(world.key, opts)}
              toggleRef={(el) => { toggleRefs.current[world.key] = el; }}
            />
          ))}
        </ul>

        {/* Categories dropdown — rendered outside the scrolling row so it isn't clipped */}
        {openWorld && openCats.length > 0 && (
          <div className="absolute top-full inset-x-0 z-50 mt-2 md:grid md:grid-cols-3 md:gap-4 pointer-events-none">
            <div
              id={menuId(openWorld.key)}
              ref={menuRef}
              onKeyDown={handleMenuKeyDown}
              className={`pointer-events-auto rounded-2xl shadow-xl border border-espresso/10 p-4 ${COL_START[openIndex]}`}
              style={{ backgroundColor: '#F7E7D5' }}
            >
              <p
                id={`${menuId(openWorld.key)}-label`}
                className="text-[10px] font-semibold uppercase tracking-wider text-espresso/65 mb-2 px-1"
              >
                {openWorld.label} categories
              </p>
              <ul aria-labelledby={`${menuId(openWorld.key)}-label`} className="space-y-1">
                {openCats.slice(0, MAX_MENU_ITEMS).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/products?categoryId=${cat.id}`}
                      onClick={() => close()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-espresso/80 hover:text-espresso hover:bg-espresso/8 focus-visible:bg-espresso/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                    >
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to={openWorld.to}
                onClick={() => close()}
                className="flex items-center justify-center gap-1.5 mt-3 px-4 py-2.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                View all {openWorld.label}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
