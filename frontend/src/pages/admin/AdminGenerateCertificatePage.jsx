import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { Button, Card, Field, Input, Page, Textarea } from '../../components/admin/ui';

export function AdminGenerateCertificatePage() {
  const navigate = useNavigate();
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

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

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
    } catch {
      setError('Failed to generate certificate. Check fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Generate Certificate" description="Create a new gemstone certificate.">
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card title="Certificate Details" subtitle="Upload images and fill in gemstone details.">
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

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !backgroundFile} className="flex-1">
                {saving ? 'Generating...' : 'Generate certificate'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/certificates')}>
                View all
              </Button>
            </div>
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
                    src={mediaUrl(result.generated_image_path)}
                    alt="Certificate"
                    className="border border-gray-200 rounded-xl w-full object-contain max-h-80"
                  />
                  <div className="mt-3">
                    <a
                      href={mediaUrl(result.generated_image_path)}
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
    </Page>
  );
}
