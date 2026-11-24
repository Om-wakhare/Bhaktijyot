import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal, Gem, CircleAlert, RotateCw } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { ProductCard } from '../../components/ui/ProductCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

const SORT_LABELS = {
  newest:     'Newest First',
  price_asc:  'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc:   'Name: A–Z',
  rating:     'Top Rated',
  oldest:     'Oldest First',
};

/* The three "worlds" the site navigation links to (/products?world=…) */
const WORLDS = {
  pooja:     { label: 'Pooja Samagri', sub: 'Sacred essentials for daily rituals' },
  crystals:  { label: 'Crystal World', sub: 'Healing crystals, certified & authentic' },
  gemstones: { label: 'Gemstones',     sub: 'Lab-certified precious gemstones' },
};

const LIMIT = 24;

const pillStyle = (active) => ({
  border: `1.5px solid ${active ? '#1D3D2C' : 'rgba(28,18,9,0.13)'}`,
  background: active ? '#1D3D2C' : '#FDF8F2',
  color: active ? '#F4E4D1' : 'rgba(28,18,9,0.62)',
});

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam        = (searchParams.get('q') || '').trim();
  const categoryParam = searchParams.get('categoryId') || '';
  const rawSort       = searchParams.get('sort') || 'newest';
  const sortParam     = SORT_LABELS[rawSort] ? rawSort : 'newest';
  const inStockParam  = searchParams.get('inStock') === 'true';
  const rawWorld      = searchParams.get('world') || '';
  const worldParam    = WORLDS[rawWorld] ? rawWorld : '';
  const parsedPage    = parseInt(searchParams.get('page') || '1', 10);
  const pageParam     = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [products, setProducts]       = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [reloadKey, setReloadKey]     = useState(0);
  const [categories, setCategories]   = useState([]);
  const [searchInput, setSearchInput] = useState(qParam);
  const resultsRef = useRef(null);

  useEffect(() => {
    api.get('/categories/flat').then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    // Ignore responses for filters the visitor has already moved on from
    let stale = false;
    setLoading(true);
    setError('');
    const params = { page: pageParam, limit: LIMIT, sort: sortParam };
    if (qParam)        params.search      = qParam;
    if (categoryParam) params.category_id = categoryParam;
    if (inStockParam)  params.in_stock    = true;
    if (worldParam)    params.world       = worldParam;

    api.get('/products/catalog', { params })
      .then((res) => {
        if (stale) return;
        setProducts(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .catch((err) => {
        if (stale) return;
        setProducts([]);
        setTotal(0);
        setError(getErrorMessage(err, 'We couldn’t load products right now.'));
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => { stale = true; };
  }, [qParam, categoryParam, sortParam, inStockParam, worldParam, pageParam, reloadKey]);

  useEffect(() => { setSearchInput(qParam); }, [qParam]);

  const updateParam = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in updates)) next.set('page', '1');
    if (next.get('page') === '1') next.delete('page');
    if (next.get('sort') === 'newest') next.delete('sort');
    setSearchParams(next, { replace: false });
  }, [searchParams, setSearchParams]);

  const goToPage = (page) => {
    updateParam({ page });
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    resultsRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam({ q: searchInput.trim(), page: 1 });
  };

  const clearAll = () =>
    updateParam({ q: '', categoryId: '', inStock: '', world: '', sort: 'newest', page: 1 });

  const totalPages = Math.ceil(total / LIMIT);
  const world = worldParam ? WORLDS[worldParam] : null;

  // When the categories are mapped to worlds, only show the ones in the current world
  const visibleCategories = useMemo(() => {
    if (!worldParam) return categories;
    const inWorld = categories.filter((c) => c.world === worldParam);
    return inWorld.length > 0 ? inWorld : categories;
  }, [categories, worldParam]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (world) chips.push({ key: 'world', label: world.label, clear: { world: '', page: 1 } });
    if (qParam) chips.push({ key: 'q', label: `"${qParam}"`, clear: { q: '', page: 1 } });
    if (categoryParam) {
      const cat = categories.find((c) => String(c.id) === categoryParam);
      chips.push({ key: 'cat', label: cat?.name ?? 'Category', clear: { categoryId: '', page: 1 } });
    }
    if (inStockParam) chips.push({ key: 'stock', label: 'In Stock Only', clear: { inStock: '', page: 1 } });
    if (sortParam !== 'newest') chips.push({ key: 'sort', label: SORT_LABELS[sortParam] ?? sortParam, clear: { sort: 'newest', page: 1 } });
    return chips;
  }, [world, qParam, categoryParam, inStockParam, sortParam, categories]);

  const hasFilters = activeChips.length > 0;

  const heading = world
    ? world.label
    : qParam
    ? `Results for "${qParam}"`
    : 'All Products';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-7">

      {/* Header */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#A8840A' }}>
          {world ? 'Shop by World' : 'Browse'}
        </div>
        <h1 className="font-display text-4xl font-semibold" style={{ color: '#1C1209' }}>
          {heading}
        </h1>
        {world && (
          <p className="text-sm" style={{ color: 'rgba(28,18,9,0.6)' }}>
            {world.sub}
            {qParam && <> · Results for &ldquo;{qParam}&rdquo;</>}
            {' · '}
            <button
              type="button"
              onClick={() => updateParam({ world: '', page: 1 })}
              className="font-semibold underline underline-offset-2 hover:no-underline"
              style={{ color: '#1D3D2C' }}
            >
              Show all products
            </button>
          </p>
        )}
        {!loading && !error && (
          <p className="text-sm" style={{ color: 'rgba(28,18,9,0.5)' }} aria-live="polite">
            {total} product{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Search + Sort + In-Stock toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2" role="search">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'rgba(28,18,9,0.30)' }} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search gemstones, crystals, pooja items..."
              aria-label="Search products"
              enterKeyHint="search"
              className="w-full pl-11 pr-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              style={{
                border: '1.5px solid rgba(28,18,9,0.13)',
                color: '#1C1209',
                background: '#FDF8F2',
              }}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-full text-sm font-semibold transition-colors shrink-0"
            style={{ background: '#1D3D2C', color: '#F4E4D1' }}
          >
            Search
          </button>
          {qParam && (
            <button
              type="button"
              onClick={() => updateParam({ q: '', page: 1 })}
              aria-label="Clear search"
              className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{ border: '1.5px solid rgba(28,18,9,0.13)', color: 'rgba(28,18,9,0.55)', background: '#FDF8F2' }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </form>

        <div className="flex gap-2 shrink-0 items-center">
          {/* In Stock toggle */}
          <button
            type="button"
            onClick={() => updateParam({ inStock: inStockParam ? '' : 'true', page: 1 })}
            aria-pressed={inStockParam}
            className="px-4 py-3 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
            style={pillStyle(inStockParam)}
          >
            ✓ In Stock
          </button>

          {/* Sort select */}
          <div className="relative flex-1 sm:flex-none">
            <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'rgba(28,18,9,0.30)' }} aria-hidden="true" />
            <select
              value={sortParam}
              onChange={(e) => updateParam({ sort: e.target.value, page: 1 })}
              aria-label="Sort products"
              className="w-full pl-11 pr-10 py-3 rounded-full text-sm appearance-none cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{
                border: '1.5px solid rgba(28,18,9,0.13)',
                background: '#FDF8F2',
                color: '#1C1209',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A–Z</option>
              <option value="rating">Top Rated</option>
              {sortParam === 'oldest' && <option value="oldest">Oldest First</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {visibleCategories.length > 0 && (
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => updateParam({ categoryId: '', page: 1 })}
            aria-pressed={!categoryParam}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
            style={pillStyle(!categoryParam)}
          >
            All
          </button>
          {visibleCategories.map((cat) => {
            const active = categoryParam === String(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateParam({ categoryId: String(cat.id), page: 1 })}
                aria-pressed={active}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
                style={pillStyle(active)}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'rgba(28,18,9,0.5)' }}>Active:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => updateParam(chip.clear)}
              aria-label={`Remove filter: ${chip.label}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: 'rgba(201,168,76,0.10)',
                color: '#7A5820',
                border: '1px solid rgba(201,168,76,0.28)',
              }}
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold underline-offset-2 hover:underline transition-colors"
            style={{ color: 'rgba(28,18,9,0.55)' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      <div ref={resultsRef} className="scroll-mt-28 lg:scroll-mt-36" aria-busy={loading ? 'true' : undefined}>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div role="alert" className="text-center py-20 space-y-4">
            <CircleAlert className="h-12 w-12 mx-auto" style={{ color: 'rgba(28,18,9,0.2)' }} aria-hidden="true" />
            <p className="font-medium" style={{ color: 'rgba(28,18,9,0.7)' }}>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
              style={{ background: '#1D3D2C', color: '#F4E4D1' }}
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Gem className="h-14 w-14 mx-auto" style={{ color: 'rgba(28,18,9,0.12)' }} aria-hidden="true" />
            <p className="font-medium" style={{ color: 'rgba(28,18,9,0.6)' }}>
              {pageParam > 1 ? 'No more products on this page.' : 'No products found.'}
            </p>
            {pageParam > 1 ? (
              <button
                type="button"
                onClick={() => goToPage(1)}
                className="text-sm font-semibold hover:underline"
                style={{ color: '#1D3D2C' }}
              >
                Back to the first page
              </button>
            ) : hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-semibold hover:underline"
                style={{ color: '#1D3D2C' }}
              >
                Clear all filters
              </button>
            ) : (
              <Link to="/" className="text-sm font-semibold hover:underline" style={{ color: '#1D3D2C' }}>
                Back to home
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!error && totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 pt-4" aria-label="Pagination">
          <button
            type="button"
            disabled={pageParam <= 1 || loading}
            onClick={() => goToPage(pageParam - 1)}
            className="px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors"
            style={{ border: '1.5px solid rgba(28,18,9,0.13)', color: '#1C1209', background: '#FDF8F2' }}
          >
            <span aria-hidden="true">← </span>Previous
          </button>
          <span className="text-sm" style={{ color: 'rgba(28,18,9,0.55)' }}>
            Page <span className="font-semibold" style={{ color: '#1C1209' }}>{pageParam}</span> of{' '}
            <span className="font-semibold" style={{ color: '#1C1209' }}>{totalPages}</span>
          </span>
          <button
            type="button"
            disabled={pageParam >= totalPages || loading}
            onClick={() => goToPage(pageParam + 1)}
            className="px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors"
            style={{ border: '1.5px solid rgba(28,18,9,0.13)', color: '#1C1209', background: '#FDF8F2' }}
          >
            Next<span aria-hidden="true"> →</span>
          </button>
        </nav>
      )}
    </div>
  );
}
