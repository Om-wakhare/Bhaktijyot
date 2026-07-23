import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import img1 from '../../assets/secondarynavimg1.png';
import img2 from '../../assets/secondarynavimg2.png';
import img3 from '../../assets/secondarynavimg3.png';

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

function WorldCard({ world, categories, isOpen, onToggle, isActive = false }) {
  const ref = useRef(null);
  const worldCats = categories.filter((c) => c.world === world.key);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onToggle(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={ref}>
      {/* Image tile */}
      <div
        className="relative overflow-hidden rounded-2xl h-32 cursor-pointer group"
        onClick={() => worldCats.length > 0 ? onToggle(isOpen ? null : world.key) : null}
        style={isActive ? { outline: '3px solid #1D3D2C', outlineOffset: '2px' } : {}}
      >
        <img
          src={world.image}
          alt={world.label}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Text sits on the cream/right portion of the image */}
        <div className="absolute inset-0 flex flex-col justify-center items-end pr-5 pl-[40%]">
          <div className="text-right">
            <h3 className="font-display text-base font-bold text-espresso leading-tight">
              {world.label}
            </h3>

            <div className="mt-2 flex items-center justify-end gap-1.5">
              <Link
                to={world.to}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                {world.cta} →
              </Link>
              {worldCats.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onToggle(isOpen ? null : world.key); }}
                  className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-espresso/10 transition-colors"
                >
                  <ChevronDown className={`h-3.5 w-3.5 text-espresso/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active ring */}
        {(isOpen || isActive) && (
          <div className="absolute inset-0 rounded-2xl ring-2 ring-primary" />
        )}

        {/* Active badge */}
        {isActive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
            Browsing
          </div>
        )}
      </div>

      {/* Categories dropdown */}
      {isOpen && worldCats.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl shadow-xl border border-espresso/10 p-4 space-y-1"
          style={{ backgroundColor: '#F4E4D1' }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-espresso/40 mb-2 px-1">
            Categories
          </div>
          {worldCats.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              to={`/products?categoryId=${cat.id}`}
              onClick={() => onToggle(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-espresso/70 hover:text-espresso hover:bg-espresso/8 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
              {cat.name}
            </Link>
          ))}
          <Link
            to={world.to}
            onClick={() => onToggle(null)}
            className="flex items-center justify-center gap-1.5 mt-2 px-4 py-2.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
          >
            {world.cta} All {world.label}
          </Link>
        </div>
      )}
    </div>
  );
}

export function SecondaryNavbar({ categories = [] }) {
  const [openWorld, setOpenWorld] = useState(null);
  const [searchParams] = useSearchParams();
  const activeWorld = searchParams.get('world') || '';

  return (
    <div
      className="border-b border-espresso/10 py-4 px-4 sm:px-6 lg:px-10"
      style={{ backgroundColor: '#F4E4D1' }}
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {WORLDS.map((world) => (
            <WorldCard
              key={world.key}
              world={world}
              categories={categories}
              isOpen={openWorld === world.key}
              onToggle={setOpenWorld}
              isActive={activeWorld === world.key}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
