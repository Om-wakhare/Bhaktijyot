import { useEffect, useState } from 'react';
import api from '../../services/apiClient';

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderCategory = (cat, level = 0) => (
    <div key={cat.id} className="border border-gray-200 rounded-lg p-4 bg-white mb-3">
      <div className="font-semibold text-gray-900" style={{ marginLeft: level * 16 }}>
        {cat.name}
      </div>
      {cat.description && (
        <div className="text-xs text-gray-500 mt-1" style={{ marginLeft: level * 16 }}>
          {cat.description}
        </div>
      )}
      {cat.children && cat.children.length > 0 && (
        <div className="mt-3 space-y-2">
          {cat.children.map((child) => renderCategory(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Categories</h1>
      {loading ? (
        <div className="text-sm text-gray-500">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-sm text-gray-500">No categories yet.</div>
      ) : (
        <div>{categories.map((cat) => renderCategory(cat))}</div>
      )}
    </div>
  );
}

