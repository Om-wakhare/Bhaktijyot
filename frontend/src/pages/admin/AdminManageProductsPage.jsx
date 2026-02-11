import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { Button, Card, Page } from '../../components/admin/ui';

export function AdminManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [mediaError, setMediaError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      if (!selectedProductId) {
        setProductImages([]);
        return;
      }
      setMediaLoading(true);
      setMediaError('');
      try {
        const res = await api.get(`/products/${selectedProductId}/images`);
        setProductImages(res.data);
      } catch {
        setProductImages([]);
        setMediaError('Failed to load product images.');
      } finally {
        setMediaLoading(false);
      }
    };
    loadImages();
  }, [selectedProductId]);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setSaving(true);
    try {
      await api.delete(`/products/${productId}`);
      if (selectedProductId === productId) setSelectedProductId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleUploadMedia = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;
    if (imageFiles.length === 0 && !videoFile) return;
    setMediaSaving(true);
    setMediaError('');
    try {
      const formData = new FormData();
      imageFiles.forEach((f) => formData.append('images', f));
      if (videoFile) formData.append('video', videoFile);
      await api.post(`/products/${selectedProductId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageFiles([]);
      setVideoFile(null);
      const imgRes = await api.get(`/products/${selectedProductId}/images`);
      setProductImages(imgRes.data);
      await load();
    } catch {
      setMediaError('Failed to upload media. Max 4 images allowed per product.');
    } finally {
      setMediaSaving(false);
    }
  };

  const onDragStart = (id) => setDraggingId(id);

  const onDropOn = async (targetId) => {
    if (!draggingId || draggingId === targetId) return;
    const fromIndex = productImages.findIndex((i) => i.id === draggingId);
    const toIndex = productImages.findIndex((i) => i.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...productImages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setProductImages(next);
    setMediaSaving(true);
    setMediaError('');
    try {
      await api.put(`/products/${selectedProductId}/images/reorder`, {
        image_ids: next.map((x) => x.id),
      });
      await load();
    } catch {
      setMediaError('Failed to reorder images.');
      const imgRes = await api.get(`/products/${selectedProductId}/images`);
      setProductImages(imgRes.data);
    } finally {
      setMediaSaving(false);
      setDraggingId(null);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!selectedProductId) return;
    setMediaSaving(true);
    setMediaError('');
    try {
      await api.delete(`/products/${selectedProductId}/images/${imageId}`);
      const imgRes = await api.get(`/products/${selectedProductId}/images`);
      setProductImages(imgRes.data);
      await load();
    } catch {
      setMediaError('Failed to delete image.');
    } finally {
      setMediaSaving(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    if (!selectedProductId) return;
    setMediaSaving(true);
    setMediaError('');
    try {
      await api.put(`/products/${selectedProductId}/images/set-primary/${imageId}`);
      await load();
    } catch {
      setMediaError('Failed to set primary image.');
    } finally {
      setMediaSaving(false);
    }
  };

  return (
    <Page
      title="Manage Products"
      description="View, delete, and manage media for existing products."
      actions={
        <Link to="/admin/products/add">
          <Button>+ Add Product</Button>
        </Link>
      }
    >
      <Card title="All Products" subtitle={`${products.length} products total`}>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-gray-500">No products yet. Click "Add Product" to create one.</div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[480px] overflow-auto">
            {products.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer transition-colors ${
                  selectedProductId === p.id ? 'bg-primary/5' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedProductId(p.id)}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                  {p.price !== null && p.price !== undefined && (
                    <div className="text-xs text-gray-600">
                      ₹ {Number(p.price).toLocaleString('en-IN')}
                      {p.mrp !== null && p.mrp !== undefined && Number(p.mrp) > Number(p.price) && (
                        <span className="ml-2 line-through text-gray-400">
                          ₹ {Number(p.mrp).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductId(p.id);
                    }}
                    className={`text-xs font-semibold rounded-md px-2.5 py-1.5 ${
                      selectedProductId === p.id
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProduct(p.id);
                    }}
                    className="text-xs font-semibold rounded-md px-2.5 py-1.5 bg-red-500 text-white hover:bg-red-600"
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedProductId && (
        <Card
          title="Media Manager"
          subtitle={`Product ID: ${selectedProductId} — Upload up to 4 images and 1 video. Drag images to reorder.`}
        >
          {mediaError && <div className="mb-3 text-xs text-red-500">{mediaError}</div>}

          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-2">Current Images (drag to reorder)</div>
            {mediaLoading ? (
              <div className="text-xs text-gray-500">Loading images...</div>
            ) : productImages.length === 0 ? (
              <div className="text-xs text-gray-500">No images uploaded yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {productImages.map((img) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => onDragStart(img.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropOn(img.id)}
                    className={`border rounded-xl overflow-hidden bg-gray-50 relative cursor-move ${
                      draggingId === img.id ? 'ring-2 ring-primary' : 'border-gray-200'
                    }`}
                    title="Drag to reorder"
                  >
                    <img
                      src={mediaUrl(img.image_path)}
                      alt="Product"
                      className="h-24 w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] px-2 py-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(img.id)}
                        className="font-semibold hover:underline"
                        disabled={mediaSaving}
                      >
                        Primary
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="font-semibold hover:underline"
                        disabled={mediaSaving}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleUploadMedia} className="space-y-3 max-w-xl">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Add Images (up to 4)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, 4))}
                  className="w-full text-xs"
                />
                {imageFiles.length > 0 && (
                  <div className="mt-1 text-[11px] text-gray-600">
                    {imageFiles.map((f) => f.name).join(', ')}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Video (optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
                {videoFile && (
                  <div className="mt-1 text-[11px] text-gray-600">{videoFile.name}</div>
                )}
              </div>
            </div>
            <Button type="submit" disabled={mediaSaving}>
              {mediaSaving ? 'Uploading...' : 'Upload media'}
            </Button>
          </form>
        </Card>
      )}
    </Page>
  );
}
