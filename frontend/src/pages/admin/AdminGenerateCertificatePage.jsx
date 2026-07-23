import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { Button, Card, Field, Input, Page, Textarea } from '../../components/admin/ui';

function pdfUrl(pngPath) {
  if (!pngPath) return '';
  return mediaUrl(pngPath.replace(/\.png$/i, '.pdf'));
}

export function AdminGenerateCertificatePage() {
  const navigate = useNavigate();

  // ── Template management ──────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateFile, setTemplateFile] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/certificates/templates');
      setTemplates(res.data);
      if (res.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(res.data[0].name);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateFile) return;
    setUploadingTemplate(true);
    setTemplateMsg('');
    try {
      const fd = new FormData();
      fd.append('file', templateFile);
      await api.post('/certificates/templates', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTemplateMsg('Template uploaded successfully.');
      setTemplateFile(null);
      await fetchTemplates();
    } catch {
      setTemplateMsg('Upload failed. Try again.');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await api.delete(`/certificates/templates/${name}`);
      if (selectedTemplate === name) setSelectedTemplate('');
      await fetchTemplates();
    } catch {
      alert('Delete failed.');
    }
  };

  // ── Certificate generation ───────────────────────────────────────────────
  const [productFile, setProductFile] = useState(null);
  const [fields, setFields] = useState({
    // Identification (header row)
    certificate_no:   '',
    issue_date:       '',
    stone_name:       '',
    // Left column
    colour:           '',
    shape:            '',
    transparency:     '',
    hardness:         '',
    magnification:    '',
    treatment:        '',
    remark:           '',
    on_behalf:        '',
    // Right column
    weight:           '',
    cut:              '',
    ri:               '',
    specific_gravity: '',
    observation:      '',
    origin:           '',
    // Landscape template (old) — kept for backward compat.
    size:             '',
    report_for:       '',
  });
  const [freeText, setFreeText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) { setError('Select a certificate template first.'); return; }
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const data = {};
      Object.entries(fields).forEach(([k, v]) => { if (v && v.trim()) data[k] = v.trim(); });

      const formData = new FormData();
      formData.append('template_name', selectedTemplate);
      if (productFile) formData.append('product_image', productFile);
      if (Object.keys(data).length > 0) formData.append('certificate_data', JSON.stringify(data));
      if (freeText.trim()) formData.append('free_text', freeText.trim());

      const res = await api.post('/certificates', formData, {
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
    <Page title="Generate Certificate" description="Create a new gemstone identification certificate.">
      <div className="space-y-6">

        {/* ── Template management ─────────────────────────────────────── */}
        <Card title="Certificate Templates" subtitle="Upload named template images once, then reuse from the list below.">
          <div className="space-y-4">
            <form onSubmit={handleUploadTemplate} className="flex flex-wrap gap-3 items-end">
              <Field label="Upload new template" hint="Name the file clearly, e.g. certificate.jpeg">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </Field>
              <Button type="submit" disabled={!templateFile || uploadingTemplate} variant="outline">
                {uploadingTemplate ? 'Uploading…' : 'Upload template'}
              </Button>
              {templateMsg && <span className="text-xs text-green-600">{templateMsg}</span>}
            </form>

            {templates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <div
                    key={t.name}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      selectedTemplate === t.name
                        ? 'border-amber-500 bg-amber-50 font-semibold text-amber-800'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedTemplate(t.name)}
                  >
                    <span>{t.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.name); }}
                      className="text-red-400 hover:text-red-600 text-xs leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No templates yet — upload one above.</p>
            )}
          </div>
        </Card>

        {/* ── Generate form + Preview ─────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <Card
            title="Certificate Details"
            subtitle={selectedTemplate ? `Template: ${selectedTemplate}` : 'Select a template above first.'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Images */}
              <Field label="Gemstone photo (optional)" hint="Placed in the photo box on the certificate.">
                <input
                  type="file" accept="image/*"
                  onChange={(e) => setProductFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
              </Field>

              {/* Identification */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Identification</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Certificate No" hint="Auto-generated if left blank.">
                    <Input name="certificate_no" value={fields.certificate_no} onChange={set('certificate_no')} placeholder="e.g. BJ-2025-001" />
                  </Field>
                  <Field label="Issue Date">
                    <Input name="issue_date" value={fields.issue_date} onChange={set('issue_date')} placeholder="e.g. 23 July 2025" />
                  </Field>
                  <Field label="Name of the Stone" className="sm:col-span-2">
                    <Input name="stone_name" value={fields.stone_name} onChange={set('stone_name')} placeholder="e.g. Ruby Corundum" />
                  </Field>
                </div>
              </div>

              {/* Left column properties */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Left Column</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Colour">
                    <Input name="colour" value={fields.colour} onChange={set('colour')} placeholder="e.g. Deep Red" />
                  </Field>
                  <Field label="Shape">
                    <Input name="shape" value={fields.shape} onChange={set('shape')} placeholder="e.g. Oval" />
                  </Field>
                  <Field label="Transparency">
                    <Input name="transparency" value={fields.transparency} onChange={set('transparency')} placeholder="e.g. Transparent" />
                  </Field>
                  <Field label="Hardness">
                    <Input name="hardness" value={fields.hardness} onChange={set('hardness')} placeholder="e.g. 9 (Mohs)" />
                  </Field>
                  <Field label="Magnification">
                    <Input name="magnification" value={fields.magnification} onChange={set('magnification')} placeholder="e.g. 10×" />
                  </Field>
                  <Field label="Treatment">
                    <Input name="treatment" value={fields.treatment} onChange={set('treatment')} placeholder="e.g. Untreated / No Heat" />
                  </Field>
                </div>
              </div>

              {/* Right column properties */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Right Column</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Weight">
                    <Input name="weight" value={fields.weight} onChange={set('weight')} placeholder="e.g. 3.45 Cts" />
                  </Field>
                  <Field label="Cut">
                    <Input name="cut" value={fields.cut} onChange={set('cut')} placeholder="e.g. Brilliant" />
                  </Field>
                  <Field label="RI (Refractive Index)">
                    <Input name="ri" value={fields.ri} onChange={set('ri')} placeholder="e.g. 1.762 – 1.770" />
                  </Field>
                  <Field label="Specific Gravity">
                    <Input name="specific_gravity" value={fields.specific_gravity} onChange={set('specific_gravity')} placeholder="e.g. 3.99 – 4.01" />
                  </Field>
                  <Field label="Observation">
                    <Input name="observation" value={fields.observation} onChange={set('observation')} placeholder="e.g. Natural, No Treatment" />
                  </Field>
                  <Field label="Origin">
                    <Input name="origin" value={fields.origin} onChange={set('origin')} placeholder="e.g. Burma / India" />
                  </Field>
                </div>
              </div>

              {/* Remarks & signatory */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Remarks &amp; Signatory</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Remark" hint="Auto-wrapped inside the remark box on the certificate.">
                    <Input name="remark" value={fields.remark} onChange={set('remark')} placeholder="e.g. Certified Natural Gemstone" />
                  </Field>
                  <Field label="On Behalf Of">
                    <Input name="on_behalf" value={fields.on_behalf} onChange={set('on_behalf')} placeholder="Customer or company name" />
                  </Field>
                </div>
              </div>

              {/* Landscape-only fields */}
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer font-semibold uppercase tracking-wide text-gray-400 mb-2">Landscape template only ▸</summary>
                <div className="grid gap-3 sm:grid-cols-2 mt-2">
                  <Field label="Size">
                    <Input name="size" value={fields.size} onChange={set('size')} placeholder="e.g. 8.2 × 6.1 mm" />
                  </Field>
                  <Field label="Report For">
                    <Input name="report_for" value={fields.report_for} onChange={set('report_for')} placeholder="Customer name" />
                  </Field>
                </div>
                <Field label="Free text" hint="Extra notes appended on the landscape template." className="mt-3">
                  <Textarea rows={2} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Additional notes..." />
                </Field>
              </details>

              {error && <div className="text-xs text-red-500">{error}</div>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !selectedTemplate} className="flex-1">
                  {saving ? 'Generating…' : 'Generate Certificate'}
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
                  <div><span className="font-semibold">Template:</span> {selectedTemplate}</div>
                  <div><span className="font-semibold">Created:</span> {new Date(result.created_at).toLocaleString()}</div>
                </div>
                {result.generated_image_path && (
                  <div>
                    <img
                      src={mediaUrl(result.generated_image_path)}
                      alt="Certificate"
                      className="border border-gray-200 rounded-xl w-full object-contain max-h-96"
                    />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <a
                        href={pdfUrl(result.generated_image_path)}
                        download={`${result.certificate_code}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        ↓ Download PDF (A4 print-ready)
                      </a>
                      <a
                        href={mediaUrl(result.generated_image_path)}
                        download={`${result.certificate_code}.png`}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium hover:underline"
                      >
                        ↓ PNG
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-8 text-center">
                Generate a certificate to see the preview here.
              </div>
            )}
          </Card>
        </div>

      </div>
    </Page>
  );
}
