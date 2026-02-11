import { useEffect, useState } from 'react';
import api from '../../services/apiClient';
import { Card, Page } from '../../components/admin/ui';

export function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    benefits: '',
    price: '',
    mrp: '',
    category_id: '',
  });
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [addImageFiles, setAddImageFiles] = useState([]);
  const [addVideoFile, setAddVideoFile] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [mediaError, setMediaError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const flattenCategories = (nodes, level = 0, acc = []) => {
    nodes.forEach((c) => {
      acc.push({ id: c.id, name: `${'— '.repeat(level)}${c.name}` });
      if (c.children && c.children.length > 0) {
        flattenCategories(c.children, level + 1, acc);
      }
    });
    return acc;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post('/products', {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        benefits: form.benefits || null,
        price: form.price ? Number(form.price) : null,
        mrp: form.mrp ? Number(form.mrp) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
      });

      const newProductId = created.data?.id;

      if (newProductId && (addImageFiles.length > 0 || addVideoFile)) {
        const formData = new FormData();
        addImageFiles.forEach((f) => formData.append('images', f));
        if (addVideoFile) formData.append('video', addVideoFile);
        await api.post(`/products/${newProductId}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setForm({
        name: '',
        slug: '',
        description: '',
        benefits: '',
        price: '',
        mrp: '',
        category_id: '',
      });

      setAddImageFiles([]);
      setAddVideoFile(null);

      if (newProductId) {
        setSelectedProductId(newProductId);
      }

      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const ok = window.confirm('Delete this product? This cannot be undone.');
    if (!ok) return;
    setSaving(true);
    try {
      await api.delete(`/products/${productId}`);
      if (selectedProductId === productId) {
        setSelectedProductId(null);
      }
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
    } catch (err) {
      setMediaError('Failed to upload media. Max 4 images allowed per product.');
    } finally {
      setMediaSaving(false);
    }
  };

  const onDragStart = (id) => {
    setDraggingId(id);
  };

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
      title="Products"
      description="Create products, set pricing (MRP/discounts), and manage images/videos."
    >
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card
          title="Products"
          subtitle="Select a product to manage media or delete it."
        >
          <div id="manage" className="scroll-mt-24" />
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-gray-500">No products yet.</div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[420px] overflow-auto">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
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
                      onClick={() => setSelectedProductId(p.id)}
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
                      onClick={() => handleDeleteProduct(p.id)}
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

          <div className="mt-5 pt-5 border-t border-gray-100">
            <div id="media" className="scroll-mt-24" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Media Manager</div>
                <div className="text-xs text-gray-500">Upload up to 4 images and 1 video. Drag images to reorder.</div>
              </div>
              <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                Product ID: {selectedProductId ?? '—'}
              </div>
            </div>

            {!selectedProductId ? (
              <div className="mt-3 text-sm text-gray-500">Select a product above to manage its media.</div>
            ) : (
              <form onSubmit={handleUploadMedia} className="mt-4 space-y-3">
                {mediaError && <div className="text-xs text-red-500">{mediaError}</div>}

                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2">Images (drag to reorder)</div>
                  {mediaLoading ? (
                    <div className="text-xs text-gray-500">Loading images...</div>
                  ) : productImages.length === 0 ? (
                    <div className="text-xs text-gray-500">No images uploaded yet.</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {productImages.map((img) => (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={() => onDragStart(img.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onDropOn(img.id)}
                          className={`border rounded-md overflow-hidden bg-gray-50 relative cursor-move ${
                            draggingId === img.id ? 'ring-2 ring-primary' : 'border-gray-200'
                          }`}
                          title="Drag to reorder"
                        >
                          <img
                            src={`/${img.image_path}`}
                            alt="Product"
                            className="h-20 w-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] px-1 py-0.5 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(img.id)}
                              className="font-semibold"
                              disabled={mediaSaving}
                            >
                              Primary
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img.id)}
                              className="font-semibold"
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Images (up to 4)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, 4))}
                      className="w-full text-xs"
                    />
                    {imageFiles.length > 0 && (
                      <div className="mt-1 text-[11px] text-gray-600">
                        Selected: {imageFiles.map((f) => f.name).join(', ')}
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
                      <div className="mt-1 text-[11px] text-gray-600">Selected: {videoFile.name}</div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mediaSaving}
                  className="w-full rounded-md bg-primary text-white text-sm font-semibold py-2 disabled:opacity-60"
                >
                  {mediaSaving ? 'Uploading...' : 'Upload media'}
                </button>
              </form>
            )}
          </div>
        </Card>

        <Card title="Add Product" subtitle="Add product details and upload images/video in one go.">
          <div id="add" className="scroll-mt-24" />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Benefits (optional)</label>
              <textarea
                name="benefits"
                value={form.benefits}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price (optional)</label>
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="₹"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">MRP (optional)</label>
                <input
                  name="mrp"
                  value={form.mrp}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="₹"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category (optional)</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No category</option>
                  {flattenCategories(categories).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary text-white text-sm font-semibold py-2 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create product'}
            </button>

            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-700 mb-2">Media (optional)</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Images (up to 4)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setAddImageFiles(Array.from(e.target.files ?? []).slice(0, 4))}
                    className="w-full text-xs"
                  />
                  {addImageFiles.length > 0 && (
                    <div className="mt-1 text-[11px] text-gray-600">
                      Selected: {addImageFiles.map((f) => f.name).join(', ')}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Video (optional)</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setAddVideoFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs"
                  />
                  {addVideoFile && (
                    <div className="mt-1 text-[11px] text-gray-600">Selected: {addVideoFile.name}</div>
                  )}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Images and video will be uploaded after the product is created.
              </div>
            </div>
          </form>
        </Card>
      </div>

    </Page>
  );
}

