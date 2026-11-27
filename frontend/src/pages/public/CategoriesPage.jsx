import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Tag } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';

function CategoryCard({ cat, level = 0 }) {
  return (
    <li className={level > 0 ? 'ml-6 mt-2' : ''}>
      <Link
        to={`/products?categoryId=${cat.id}`}
        className="group flex items-center justify-between bg-white border border-gold/25 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
            <Tag className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-espresso group-hover:text-primary transition-colors">
              {cat.name}
            </div>
            {cat.description && (
              <div className="text-xs text-espresso/65 mt-0.5">{cat.description}</div>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-primary/50 group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
      </Link>

      {cat.children && cat.children.length > 0 && (
        <ul className="mt-2 space-y-2 border-l-2 border-gold/25 pl-4">
          {cat.children.map((child) => (
            <CategoryCard key={child.id} cat={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/categories')
      .then((res) => { if (!cancelled) setCategories(Array.isArray(res.data) ? res.data : []); })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err, 'Could not load categories.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Browse</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">Categories</h1>
        <p className="text-sm text-espresso/70">Explore our range of gemstones, crystals, and pooja essentials</p>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading categories">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl shimmer-bg" />)}
        </div>
      ) : error ? (
        <div role="alert" className="text-center py-16 text-espresso/70">
          <p className="text-sm">{error}</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Browse all products
          </Link>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-espresso/60">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm">No categories yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {categories.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
        </ul>
      )}
    </div>
  );
}
