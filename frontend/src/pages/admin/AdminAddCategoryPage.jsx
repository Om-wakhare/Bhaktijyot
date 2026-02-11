import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { Button, Card, Field, Input, Page, Select, Textarea } from '../../components/admin/ui';

export function AdminAddCategoryPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '' });

  const flatten = (cats, level = 0, acc = []) => {
    cats.forEach((c) => {
      acc.push({ ...c, level });
      if (c.children?.length) flatten(c.children, level + 1, acc);
    });
    return acc;
  };

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(flatten(res.data)));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/categories', {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      });
      navigate('/admin/categories');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Add Category" description="Create a new product category.">
      <Card title="Category Details" subtitle="Fill in the category information.">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <Field label="Name">
            <Input name="name" value={form.name} onChange={handleChange} required />
          </Field>

          <Field label="Slug">
            <Input name="slug" value={form.slug} onChange={handleChange} required />
          </Field>

          <Field label="Description (optional)">
            <Textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </Field>

          <Field label="Parent category" hint="Leave as 'No parent' for a root category.">
            <Select name="parent_id" value={form.parent_id} onChange={handleChange}>
              <option value="">No parent (root)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {'—'.repeat(c.level)} {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create category'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/categories')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
