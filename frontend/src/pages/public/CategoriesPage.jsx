import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Tag } from 'lucide-react';
import api from '../../services/apiClient';

function CategoryCard({ cat, level = 0 }) {
  return (
    <div className={level > 0 ? 'ml-6 mt-2' : ''}>
      <Link
        to={`/products?categoryId=${cat.id}`}
        className="group flex items-center justify-between bg-white border border-stone-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Tag className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-warmBrown group-hover:text-primary transition-colors">
              {cat.name}
            </div>
            {cat.description && (
              <div className="text-xs text-stone-400 mt-0.5">{cat.description}</div>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors shrink-0" />
      </Link>

      {cat.children && cat.children.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-stone-100 pl-4">
          {cat.children.map((child) => (
            <CategoryCard key={child.id} cat={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Browse</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">Categories</h1>
        <p className="text-sm text-warmBrown/60">Explore our range of gemstones, crystals, and pooja essentials</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-stone-100 rounded-2xl shimmer-bg" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-warmBrown/40">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
        </div>
      )}
    </div>
  );
}
