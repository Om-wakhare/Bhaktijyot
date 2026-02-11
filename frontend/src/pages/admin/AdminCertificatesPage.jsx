import { useEffect, useState } from 'react';
import api from '../../services/apiClient';
import { Button, Card, Field, Input, Page, Textarea } from '../../components/admin/ui';

export function AdminCertificatesPage() {
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [productFile, setProductFile] = useState(null);
  const [fields, setFields] = useState({
    report_for: '',
    certificate_no: '',
    size: '',
    weight: '',
    shape: '',
    transparency: '',
    colour: '',
    observation: '',
  });
  const [freeText, setFreeText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const loadList = async (opts = {}) => {
    const nextPage = opts.page ?? page;
    const nextSearch = opts.search ?? search;
    setListLoading(true);
    setListError('');
    try {
      const res = await api.get('/certificates/admin', {
        params: {
          page: nextPage,
          limit,
          search: nextSearch?.trim() ? nextSearch.trim() : undefined,
        },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
      setListError('Failed to load certificates.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList({ page, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1, search });
  };

  const handleDelete = async (certificateId) => {
    const ok = window.confirm('Delete this certificate? This cannot be undone.');
    if (!ok) return;
    setListLoading(true);
    setListError('');
    try {
      await api.delete(`/certificates/admin/${certificateId}`);
      await loadList({ page, search });
    } catch {
      setListError('Failed to delete certificate.');
      setListLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!backgroundFile) return;
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const data = {};
      Object.entries(fields).forEach(([key, value]) => {
        if (value && value.trim()) data[key] = value.trim();
      });
      const formData = new FormData();
      formData.append('background_image', backgroundFile);
      if (productFile) formData.append('product_image', productFile);
      if (Object.keys(data).length > 0) {
        formData.append('certificate_data', JSON.stringify(data));
      }
      if (freeText.trim()) {
        formData.append('free_text', freeText.trim());
      }
      const res = await api.post('/certificates/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      loadList({ page: 1, search: '' });
    } catch {
      setError('Failed to generate certificate. Check fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Certificates" description="Generate gemstone certificates and manage existing ones.">
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card title="Generate Certificate" subtitle="Upload images and fill in gemstone details.">
          <div id="generate" className="scroll-mt-24" />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Background image *">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBackgroundFile(e.target.files?.[0] ?? null)}
                  required
                  className="w-full text-xs"
                />
              </Field>
              <Field label="Product image (optional)">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Report for">
                <Input name="report_for" value={fields.report_for} onChange={handleFieldChange} placeholder="e.g. Identification Report" />
              </Field>
              <Field label="Certificate no">
                <Input name="certificate_no" value={fields.certificate_no} onChange={handleFieldChange} />
              </Field>
              <Field label="Size">
                <Input name="size" value={fields.size} onChange={handleFieldChange} />
              </Field>
              <Field label="Weight">
                <Input name="weight" value={fields.weight} onChange={handleFieldChange} />
              </Field>
              <Field label="Shape">
                <Input name="shape" value={fields.shape} onChange={handleFieldChange} />
              </Field>
              <Field label="Transparency">
                <Input name="transparency" value={fields.transparency} onChange={handleFieldChange} />
              </Field>
              <Field label="Colour">
                <Input name="colour" value={fields.colour} onChange={handleFieldChange} />
              </Field>
              <Field label="Observation">
                <Input name="observation" value={fields.observation} onChange={handleFieldChange} />
              </Field>
            </div>

            <Field label="Free text (optional)" hint="Appended after structured fields on the certificate.">
              <Textarea rows={3} value={freeText} onChange={(e) => setFreeText(e.target.value)} />
            </Field>

            {error && <div className="text-xs text-red-500">{error}</div>}

            <Button type="submit" disabled={saving || !backgroundFile} className="w-full">
              {saving ? 'Generating...' : 'Generate certificate'}
            </Button>
          </form>
        </Card>

        <Card title="Preview" subtitle="Generated certificate preview and download.">
          {result ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-700 space-y-1">
                <div><span className="font-semibold">Code:</span> {result.certificate_code}</div>
                <div><span className="font-semibold">Created:</span> {new Date(result.created_at).toLocaleString()}</div>
              </div>
              {result.generated_image_path && (
                <div>
                  <img
                    src={`/${result.generated_image_path}`}
                    alt="Certificate"
                    className="border border-gray-200 rounded-xl w-full object-contain max-h-80"
                  />
                  <div className="mt-3">
                    <a
                      href={`/${result.generated_image_path}`}
                      download
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                    >
                      Download image
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-8 text-center">
              Generate a certificate to see preview here.
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Manage Certificates"
        subtitle="Search by code, preview, download, or delete."
        actions={
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code"
              className="w-48"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
        }
      >
        <div id="manage" className="scroll-mt-24" />

        {listError && <div className="mb-3 text-sm text-red-600">{listError}</div>}

        {listLoading ? (
          <div className="py-6 text-sm text-gray-500 text-center">Loading certificates...</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 text-center">No certificates found.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Code</th>
                  <th className="text-left font-semibold px-4 py-3">Created</th>
                  <th className="text-left font-semibold px-4 py-3">Preview</th>
                  <th className="text-right font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{c.certificate_code}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {c.generated_image_path ? (
                        <a href={`/${c.generated_image_path}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.generated_image_path && (
                          <a
                            href={`/${c.generated_image_path}`}
                            download
                            className="px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                          >
                            Download
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-2.5 py-1.5 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            Total: {total} | Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
