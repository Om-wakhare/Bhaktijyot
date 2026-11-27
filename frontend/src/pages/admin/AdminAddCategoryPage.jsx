import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/apiClient';
import { Alert, Button, Card, Field, Input, Page, Select, Textarea } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import {
  SLUG_HINT, SLUG_RE, WORLD_HINT, WORLD_OPTIONS, flattenTree, indentLabel, slugConflictMessage, slugify,
} from '../../components/admin/adminUtils';

const EMPTY = { name: '', slug: '', description: '', parent_id: '', world: '' };

export function AdminAddCategoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tree, setTree] = useState([]);
  const [treeError, setTreeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);

  const loadTree = useCallback(async () => {
    setTreeError('');
    try {
      const res = await api.get('/categories');
      setTree(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setTreeError(getErrorMessage(err, 'Could not load existing categories.'));
    }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const categories = useMemo(() => flattenTree(tree), [tree]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === 'name' && !slugTouched) {
      setForm((prev) => ({ ...prev, name: value, slug: slugify(value) }));
      return;
    }
    if (name === 'slug') {
      const touched = value.trim() !== '';
      setSlugTouched(touched);
      setForm((prev) => ({ ...prev, slug: touched ? value : slugify(prev.name) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    const slug = form.slug.trim();
    if (!slug) errors.slug = 'Slug is required.';
    else if (!SLUG_RE.test(slug)) errors.slug = SLUG_HINT;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await api.post('/categories', {
        name: form.name.trim(),
        slug,
        description: form.description.trim() ? form.description : null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        world: form.world || null,
      });
      toast.success(`Category "${form.name.trim()}" created`);
      navigate('/admin/categories');
    } catch (err) {
      // e.g. 409 "Category slug already exists", 400 parent not found, 422 slug format
      setError(slugConflictMessage(err, 'category', slug, 'Could not create the category.'));
      setSaving(false);
    }
  };

  const parent = form.parent_id ? categories.find((c) => String(c.id) === form.parent_id) : null;

  return (
    <Page title="Add Category" description="Create a new product category.">
      <Card title="Category Details" subtitle="Fill in the category information.">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg" noValidate>
          <Field label="Name *" error={fieldErrors.name} htmlFor="c-name">
            <Input id="c-name" name="name" value={form.name} onChange={handleChange} required maxLength={255} />
          </Field>

          <Field
            label="Slug *"
            htmlFor="c-slug"
            error={fieldErrors.slug}
            hint={`${SLUG_HINT}. ${slugTouched ? 'Edited by hand.' : 'Suggested from the name.'}`}
          >
            <Input id="c-slug" name="slug" value={form.slug} onChange={handleChange} required />
          </Field>

          <Field label="Description (optional)" htmlFor="c-description">
            <Textarea id="c-description" name="description" value={form.description} onChange={handleChange} rows={3} maxLength={1000} />
          </Field>

          <Field
            label="Parent category"
            htmlFor="c-parent"
            hint={treeError ? undefined : "Leave as 'No parent' for a top-level category."}
            error={treeError || undefined}
          >
            <Select id="c-parent" name="parent_id" value={form.parent_id} onChange={handleChange}>
              <option value="">No parent (top level)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{indentLabel(c.level, c.name)}</option>
              ))}
            </Select>
            {treeError && (
              <button type="button" onClick={loadTree} className="mt-1 text-[11px] font-semibold text-primary hover:underline">
                Retry
              </button>
            )}
          </Field>

          <Field
            label="World"
            htmlFor="c-world"
            hint={
              parent
                ? `${WORLD_HINT} Leave as None to inherit from “${parent.name}”.`
                : WORLD_HINT
            }
          >
            <Select id="c-world" name="world" value={form.world} onChange={handleChange}>
              {WORLD_OPTIONS.map((o) => (
                <option key={o.value || 'none'} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create category'}
            </Button>
            <Button variant="outline" to="/admin/categories" disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
