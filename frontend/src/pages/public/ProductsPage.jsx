import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/products', {
          params: categoryId ? { category_id: categoryId } : undefined,
        });
        setProducts(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Products</h1>
      {loading ? (
        <div className="text-sm text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-sm text-gray-500">No products found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {p.image_path ? (
                <img
                  src={mediaUrl(p.image_path)}
                  alt={p.name}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                  No image
                </div>
              )}
              <div className="p-3 space-y-1">
                <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                {p.benefits && (
                  <div className="text-xs text-gray-500 line-clamp-2">{p.benefits}</div>
                )}
                {p.price !== null && p.price !== undefined && (
                  <div className="text-sm font-semibold text-primary mt-1">
                    ₹ {Number(p.price).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

