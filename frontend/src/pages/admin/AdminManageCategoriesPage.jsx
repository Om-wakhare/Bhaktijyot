import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage } from '../../services/apiClient';
import {
  Alert, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Page, Pill, Select, Textarea,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import {
  SLUG_HINT, SLUG_RE, WORLD_HINT, WORLD_OPTIONS, flattenTree, indentLabel, slugify, subtreeIds,
  useLatestRequest, worldLabel,
} from '../../components/admin/adminUtils';

const EMPTY = { name: '', slug: '', description: '', parent_id: '', world: '' };

export function AdminManageCategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const beginRequest = useLatestRequest();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const flatCategories = useMemo(() => flattenTree(categories), [categories]);

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/categories');
      if (isCurrent()) setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Could not load categories.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [beginRequest]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setFormError('');
    setFieldErrors({});
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setFormError('');
    setFieldErrors({});
    setForm({
      name: cat.name ?? '',
      slug: cat.slug ?? '',
      description: cat.description ?? '',
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      world: cat.world ?? '',
    });
  };

  // A category can't move under itself or any of its own descendants
  const blockedParentIds = useMemo(
    () => (editingId ? subtreeIds(categories, editingId) : new Set()),
    [categories, editingId],
  );

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId || saving) return;
    setFormError('');
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    const slug = form.slug.trim();
    if (!slug) errors.slug = 'Slug is required.';
    else if (!SLUG_RE.test(slug)) errors.slug = SLUG_HINT;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await api.put(`/categories/${editingId}`, {
        name: form.name.trim(),
        slug,
        description: form.description.trim() ? form.description : null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        world: form.world || null,
      });
      toast.success(`Category "${form.name.trim()}" updated`);
      resetForm();
      await load();
    } catch (err) {
      // 409 duplicate slug, 400 cycle / missing parent, 422 slug format
      setFormError(getErrorMessage(err, 'Could not update the category.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    const childCount = cat.children?.length ?? 0;
    const ok = await confirm({
      title: `Delete "${cat.name}"?`,
      message:
        (childCount
          ? `It has ${childCount} subcategor${childCount === 1 ? 'y' : 'ies'}, which must be moved or deleted first. `
          : '') +
        'Categories that still have products can’t be deleted either — move those products to another category first. This cannot be undone.',
      confirmLabel: 'Delete category',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(cat.id);
    try {
      await api.delete(`/categories/${cat.id}`);
      if (editingId === cat.id) resetForm();
      toast.success(`Category "${cat.name}" deleted`);
      await load();
    } catch (err) {
      // 409 explains what still uses the category
      toast.error(getErrorMessage(err, 'Could not delete the category.'));
    } finally {
      setDeletingId(null);
    }
  };

  const renderCategory = (cat) => (
    <div
      key={cat.id}
      className={`flex items-center justify-between gap-2 pr-4 py-2.5 transition-colors ${
        editingId === cat.id ? 'bg-primary/5' : 'hover:bg-gray-50'
      }`}
      style={{ paddingLeft: 16 + cat.level * 20 }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate">{cat.name}</span>
          {cat.world && <Pill className="bg-gold/15 text-gold-700">{worldLabel(cat.world)}</Pill>}
        </div>
        <div className="text-[11px] text-gray-400 truncate">
          /{cat.slug}
          {cat.description ? ` · ${cat.description}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="secondary" size="sm" onClick={() => startEdit(cat)}>
          Edit
        </Button>
        <Button
          variant="danger" size="sm"
          onClick={() => handleDelete(cat)}
          disabled={deletingId === cat.id}
        >
          {deletingId === cat.id ? '…' : 'Delete'}
        </Button>
      </div>
    </div>
  );

  const editingCat = editingId ? flatCategories.find((c) => c.id === editingId) : null;
  const parentForHint = form.parent_id ? flatCategories.find((c) => String(c.id) === form.parent_id) : null;

  return (
    <Page
      title="Manage Categories"
      description="Edit or delete existing categories."
      actions={<Button to="/admin/categories/add">+ Add Category</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card title="All Categories" subtitle={loading ? undefined : `${flatCategories.length} categories total`}>
          {loading && !categories.length ? (
            <LoadingState label="Loading categories…" />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={load} />
          ) : categories.length === 0 ? (
            <EmptyState>No categories yet. Click “Add Category” to create one.</EmptyState>
          ) : (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[520px] overflow-auto">
              {flatCategories.map(renderCategory)}
            </div>
          )}
        </Card>

        {editingId && (
          <Card title="Edit Category" subtitle={editingCat ? `Editing “${editingCat.name}”` : 'Update the selected category.'}>
            <form onSubmit={handleUpdate} className="space-y-3" noValidate>
              <Field label="Name *" error={fieldErrors.name}>
                <Input name="name" value={form.name} onChange={handleChange} required maxLength={255} />
              </Field>

              <Field
                label="Slug *"
                error={fieldErrors.slug}
                hint={`${SLUG_HINT}. Changing it changes the category's link.`}
              >
                <div className="flex gap-2">
                  <Input name="slug" value={form.slug} onChange={handleChange} required className="flex-1" />
                  <Button
                    variant="outline" size="sm"
                    className="shrink-0 whitespace-nowrap"
                    disabled={!form.name.trim()}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
                      setFieldErrors((prev) => ({ ...prev, slug: undefined }));
                    }}
                  >
                    From name
                  </Button>
                </div>
              </Field>

              <Field label="Description (optional)">
                <Textarea name="description" value={form.description} onChange={handleChange} rows={3} maxLength={1000} />
              </Field>

              <Field label="Parent category" hint="A category can't be moved inside itself or its own subcategories.">
                <Select name="parent_id" value={form.parent_id} onChange={handleChange}>
                  <option value="">No parent (top level)</option>
                  {flatCategories
                    .filter((c) => !blockedParentIds.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>{indentLabel(c.level, c.name)}</option>
                    ))}
                </Select>
              </Field>

              <Field
                label="World"
                hint={parentForHint ? `${WORLD_HINT} Leave as None to inherit from “${parentForHint.name}”.` : WORLD_HINT}
              >
                <Select name="world" value={form.world} onChange={handleChange}>
                  {WORLD_OPTIONS.map((o) => (
                    <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>

              {formError && <Alert tone="error">{formError}</Alert>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Update category'}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </Page>
  );
}
