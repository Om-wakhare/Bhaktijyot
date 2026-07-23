import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal, Gem } from 'lucide-react';
import api from '../../services/apiClient';
import { useCart } from '../../services/cart';
import { ProductCard } from '../../components/ui/ProductCard';

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: '#FAF3E8',
      boxShadow: '0 0 0 1.5px rgba(201,168,76,0.32), 0 2px 14px rgba(28,18,9,0.06)',
    }}>
      <div className="aspect-square shimmer-bg" style={{ background: '#F0E4CE' }} />
      <div className="p-3 space-y-2.5">
        <div className="h-3 rounded-full shimmer-bg" />
        <div className="h-3 rounded-full shimmer-bg w-2/3" />
        <div className="h-4 rounded-full shimmer-bg w-1/2" />
        <div className="h-8 rounded-lg shimmer-bg mt-1" />
      </div>
    </div>
  );
}

const SORT_LABELS = {
  newest:     'Newest First',
  price_asc:  'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc:   'Name: A–Z',
  rating:     'Top Rated',
};

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const [whatsappNumber, setWhatsappNumber] = useState('918484913170');

  const qParam        = searchParams.get('q') || '';
  const categoryParam = searchParams.get('categoryId') || '';
  const sortParam     = searchParams.get('sort') || 'newest';
  const inStockParam  = searchParams.get('inStock') === 'true';
  const pageParam     = parseInt(searchParams.get('page') || '1', 10);

  const [products, setProducts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState(qParam);

  const LIMIT = 24;

  useEffect(() => {
    api.get('/categories/flat').then((res) => setCategories(res.data || [])).catch(() => {});
    api.get('/site-config').then((res) => {
      if (res.data?.whatsapp_number) setWhatsappNumber(res.data.whatsapp_number);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page: pageParam, limit: LIMIT, sort: sortParam };
    if (qParam)        params.search      = qParam;
    if (categoryParam) params.category_id = categoryParam;
    if (inStockParam)  params.in_stock    = true;

    api.get('/products/catalog', { params })
      .then((res) => { setProducts(res.data.items || []); setTotal(res.data.total || 0); })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [qParam, categoryParam, sortParam, inStockParam, pageParam]);

  useEffect(() => { setSearchInput(qParam); }, [qParam]);

  const updateParam = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in updates)) next.set('page', '1');
    setSearchParams(next, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam({ q: searchInput.trim(), page: 1 });
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (qParam) chips.push({ key: 'q', label: `"${qParam}"`, clear: { q: '', page: 1 } });
    if (categoryParam) {
      const cat = categories.find((c) => String(c.id) === categoryParam);
      chips.push({ key: 'cat', label: cat?.name ?? 'Category', clear: { categoryId: '', page: 1 } });
    }
    if (inStockParam) chips.push({ key: 'stock', label: 'In Stock Only', clear: { inStock: '', page: 1 } });
    if (sortParam !== 'newest') chips.push({ key: 'sort', label: SORT_LABELS[sortParam] ?? sortParam, clear: { sort: 'newest', page: 1 } });
    return chips;
  }, [qParam, categoryParam, inStockParam, sortParam, categories]);

  const hasFilters = activeChips.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-7">

      {/* Header */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Browse</div>
        <h1 className="font-display text-4xl font-semibold" style={{ color: '#1C1209' }}>
          {qParam ? `Results for "${qParam}"` : 'All Products'}
        </h1>
        {!loading && (
          <p className="text-sm" style={{ color: 'rgba(28,18,9,0.45)' }}>
            {total} product{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Search + Sort + In-Stock toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'rgba(28,18,9,0.30)' }} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search gemstones, crystals, pooja items..."
              className="w-full pl-11 pr-4 py-3 rounded-full text-sm focus:outline-none transition-all"
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
              className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{ border: '1.5px solid rgba(28,18,9,0.13)', color: 'rgba(28,18,9,0.45)', background: '#FDF8F2' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex gap-2 shrink-0 items-center">
          {/* In Stock toggle */}
          <button
            type="button"
            onClick={() => updateParam({ inStock: inStockParam ? '' : 'true', page: 1 })}
            className="px-4 py-3 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              border: `1.5px solid ${inStockParam ? '#1D3D2C' : 'rgba(28,18,9,0.13)'}`,
              background: inStockParam ? '#1D3D2C' : '#FDF8F2',
              color: inStockParam ? '#F4E4D1' : 'rgba(28,18,9,0.55)',
            }}
          >
            ✓ In Stock
          </button>

          {/* Sort select */}
          <div className="relative">
            <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'rgba(28,18,9,0.30)' }} />
            <select
              value={sortParam}
              onChange={(e) => updateParam({ sort: e.target.value, page: 1 })}
              className="pl-11 pr-10 py-3 rounded-full text-sm appearance-none cursor-pointer transition-all focus:outline-none"
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
            </select>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => updateParam({ categoryId: '', page: 1 })}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
            style={{
              border: `1.5px solid ${!categoryParam ? '#1D3D2C' : 'rgba(28,18,9,0.13)'}`,
              background: !categoryParam ? '#1D3D2C' : '#FDF8F2',
              color: !categoryParam ? '#F4E4D1' : 'rgba(28,18,9,0.55)',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam({ categoryId: String(cat.id), page: 1 })}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{
                border: `1.5px solid ${categoryParam === String(cat.id) ? '#1D3D2C' : 'rgba(28,18,9,0.13)'}`,
                background: categoryParam === String(cat.id) ? '#1D3D2C' : '#FDF8F2',
                color: categoryParam === String(cat.id) ? '#F4E4D1' : 'rgba(28,18,9,0.55)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'rgba(28,18,9,0.38)' }}>Active:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => updateParam(chip.clear)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: 'rgba(201,168,76,0.10)',
                color: '#7A5820',
                border: '1px solid rgba(201,168,76,0.28)',
              }}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateParam({ q: '', categoryId: '', inStock: '', sort: 'newest', page: 1 })}
            className="text-xs font-semibold underline-offset-2 hover:underline transition-colors"
            style={{ color: 'rgba(28,18,9,0.38)' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <Gem className="h-14 w-14 mx-auto" style={{ color: 'rgba(28,18,9,0.12)' }} />
          <p className="font-medium" style={{ color: 'rgba(28,18,9,0.45)' }}>No products found.</p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => updateParam({ q: '', categoryId: '', inStock: '', sort: 'newest', page: 1 })}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#1D3D2C' }}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onAddToCart={addItem}
              whatsappNumber={whatsappNumber}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            disabled={pageParam <= 1}
            onClick={() => updateParam({ page: pageParam - 1 })}
            className="px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors"
            style={{ border: '1.5px solid rgba(28,18,9,0.13)', color: '#1C1209', background: '#FDF8F2' }}
          >
            ← Previous
          </button>
          <span className="text-sm" style={{ color: 'rgba(28,18,9,0.45)' }}>
            Page <span className="font-semibold" style={{ color: '#1C1209' }}>{pageParam}</span> of{' '}
            <span className="font-semibold" style={{ color: '#1C1209' }}>{totalPages}</span>
          </span>
          <button
            type="button"
            disabled={pageParam >= totalPages}
            onClick={() => updateParam({ page: pageParam + 1 })}
            className="px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors"
            style={{ border: '1.5px solid rgba(28,18,9,0.13)', color: '#1C1209', background: '#FDF8F2' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
