import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';

const WHATSAPP_NUMBER = '918484913170';

export function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading product...</div>;
  }

  if (!product) {
    return <div className="text-sm text-red-500">Product not found.</div>;
  }

  const message = encodeURIComponent(
    `Namaste, I am interested in this product from Bhaktijyot:\n\n${product.name}\n\nLink: ${window.location.href}`,
  );

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr,1fr]">
      <div className="space-y-4">
        {product.image_path ? (
          <img
            src={mediaUrl(product.image_path)}
            alt={product.name}
            className="w-full rounded-xl border border-gray-200 object-cover max-h-80"
          />
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
            No image available
          </div>
        )}
        {product.video_path && (
          <video
            controls
            className="w-full rounded-xl border border-gray-200 max-h-72 bg-black"
          >
            <source src={mediaUrl(product.video_path)} />
          </video>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
          {product.price !== null && product.price !== undefined && (
            <div className="text-xl font-semibold text-primary mt-1">
              ₹ {Number(product.price).toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {product.description && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {product.benefits && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Benefits</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{product.benefits}</p>
          </div>
        )}

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-5 py-2.5 rounded-full bg-green-500 text-white text-sm font-semibold shadow hover:bg-green-600"
        >
          Order this on WhatsApp
        </a>
      </div>
    </div>
  );
}

