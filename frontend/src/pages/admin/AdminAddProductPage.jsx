import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { Button, Card, Field, Input, Page, Select, Textarea } from '../../components/admin/ui';

export function AdminAddProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    benefits: '',
    price: '',
    mrp: '',
    category_id: '',
  });
  const [addImageFiles, setAddImageFiles] = useState([]);
  const [addVideoFile, setAddVideoFile] = useState(null);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

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

      navigate('/admin/products');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Add Product" description="Create a new product with pricing and media.">
      <Card title="Product Details" subtitle="Fill in product information and optionally attach images/video.">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" value={form.name} onChange={handleChange} required />
            </Field>
            <Field label="Slug">
              <Input name="slug" value={form.slug} onChange={handleChange} required />
            </Field>
          </div>

          <Field label="Description (optional)">
            <Textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </Field>

          <Field label="Benefits (optional)">
            <Textarea name="benefits" value={form.benefits} onChange={handleChange} rows={3} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (optional)">
              <Input name="price" value={form.price} onChange={handleChange} placeholder="₹" />
            </Field>
            <Field label="MRP (optional)">
              <Input name="mrp" value={form.mrp} onChange={handleChange} placeholder="₹" />
            </Field>
            <Field label="Category (optional)">
              <Select name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">No category</option>
                {flattenCategories(categories).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="text-sm font-semibold text-gray-900 mb-3">Media (optional)</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Images (up to 4)">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setAddImageFiles(Array.from(e.target.files ?? []).slice(0, 4))}
                  className="w-full text-xs"
                />
                {addImageFiles.length > 0 && (
                  <div className="mt-1 text-[11px] text-gray-600">
                    {addImageFiles.map((f) => f.name).join(', ')}
                  </div>
                )}
              </Field>
              <Field label="Video (optional)">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setAddVideoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
                {addVideoFile && (
                  <div className="mt-1 text-[11px] text-gray-600">{addVideoFile.name}</div>
                )}
              </Field>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Images and video will be uploaded after the product is created.
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create product'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
