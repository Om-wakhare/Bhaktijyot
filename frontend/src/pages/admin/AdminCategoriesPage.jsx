import { useEffect, useState } from 'react';
import api from '../../services/apiClient';
import { Button, Card, Field, Input, Page, Select, Textarea } from '../../components/admin/ui';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
      setFlatCategories(flatten(res.data));
    } finally {
      setLoading(false);
    }
  };

  const flatten = (cats, level = 0, acc = []) => {
    cats.forEach((c) => {
      acc.push({ ...c, level });
      if (c.children?.length) flatten(c.children, level + 1, acc);
    });
    return acc;
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', parent_id: '' });
    setEditingId(null);
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug ?? '',
      description: cat.description ?? '',
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
    });
    document.getElementById('add')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      };
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? This cannot be undone.')) return;
    setSaving(true);
    try {
      await api.delete(`/categories/${id}`);
      if (editingId === id) resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const renderCategory = (cat, level = 0) => (
    <div
      key={cat.id}
      className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-gray-50"
      style={{ paddingLeft: 16 + level * 20 }}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{cat.name}</div>
        {cat.description && (
          <div className="text-xs text-gray-500 truncate">{cat.description}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => startEdit(cat)}
          className="px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => handleDelete(cat.id)}
          className="px-2.5 py-1.5 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600"
          disabled={saving}
        >
          Delete
        </button>
      </div>
    </div>
  );

  const renderTree = (cats, level = 0) =>
    cats.map((cat) => (
      <div key={cat.id}>
        {renderCategory(cat, level)}
        {cat.children?.length > 0 && renderTree(cat.children, level + 1)}
      </div>
    ));

  return (
    <Page title="Categories" description="Organize products into categories and subcategories.">
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card title="Manage Categories" subtitle="Edit or delete existing categories.">
          <div id="manage" className="scroll-mt-24" />
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-gray-500">No categories yet.</div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[480px] overflow-auto">
              {renderTree(categories)}
            </div>
          )}
        </Card>

        <Card
          title={editingId ? 'Edit Category' : 'Add Category'}
          subtitle={editingId ? 'Update the selected category.' : 'Create a new category.'}
        >
          <div id="add" className="scroll-mt-24" />
          <form onSubmit={handleSubmit} className="space-y-3">
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
                {flatCategories
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {'—'.repeat(c.level)} {c.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving...' : editingId ? 'Update category' : 'Create category'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </Page>
  );
}
