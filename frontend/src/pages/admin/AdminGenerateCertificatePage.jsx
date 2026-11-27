import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import {
  Alert, Button, Card, Field, FileInput, Input, Page, Textarea, cn,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import { fileExt, formatBytes, formatDateTime } from '../../components/admin/adminUtils';

// MIME types + extensions: Android file pickers filter on MIME type, desktop browsers on extension.
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp'];
const MAX_TEMPLATE_BYTES = 15 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function pdfUrl(pngPath) {
  if (!pngPath || !/\.png$/i.test(pngPath)) return '';
  return mediaUrl(pngPath.replace(/\.png$/i, '.pdf'));
}

/** Mirrors the server: template name = file stem with anything but letters/digits/space/-/_ turned into "-". */
function templateNameFromFile(filename) {
  const stem = String(filename || '').replace(/\.[^.]*$/, '');
  return stem
    .trim()
    .replace(/[^A-Za-z0-9 _-]+/g, '-')
    .replace(/^[ _-]+|[ _-]+$/g, '')
    .slice(0, 80);
}

function imageFileError(file, maxBytes, what) {
  if (!file) return '';
  if (!IMAGE_EXTS.includes(fileExt(file.name))) return `${what} must be a PNG, JPG or WebP image.`;
  if (file.size > maxBytes) return `${what} is too large (${formatBytes(file.size)}; max ${maxBytes / (1024 * 1024)} MB).`;
  return '';
}

export function AdminGenerateCertificatePage() {
  const toast = useToast();
  const confirm = useConfirm();

  // ── Template management ──────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateFile, setTemplateFile] = useState(null);
  const [templateInputKey, setTemplateInputKey] = useState(0);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState(null); // { tone, text }
  const [deletingTemplate, setDeletingTemplate] = useState('');

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError('');
    try {
      const res = await api.get('/certificates/templates');
      const list = Array.isArray(res.data) ? res.data : [];
      setTemplates(list);
      // Keep the current choice if it still exists, otherwise pick the first template
      setSelectedTemplate((prev) => (prev && list.some((t) => t.name === prev) ? prev : list[0]?.name ?? ''));
      return list;
    } catch (err) {
      setTemplatesError(getErrorMessage(err, 'Could not load certificate templates.'));
      return null;
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const onTemplateFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setTemplateMsg(null);
    const err = imageFileError(file, MAX_TEMPLATE_BYTES, 'Template');
    if (err) {
      setTemplateMsg({ tone: 'error', text: err });
      setTemplateFile(null);
      setTemplateInputKey((k) => k + 1);
      return;
    }
    if (file && !templateNameFromFile(file.name)) {
      setTemplateMsg({ tone: 'error', text: 'Rename the file using letters, numbers, spaces, hyphens or underscores.' });
      setTemplateFile(null);
      setTemplateInputKey((k) => k + 1);
      return;
    }
    setTemplateFile(file);
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateFile || uploadingTemplate) return;
    setTemplateMsg(null);
    setUploadingTemplate(true);
    try {
      // Uploading a template with an existing name replaces it on the server — ask first
      const name = templateNameFromFile(templateFile.name);
      const latest = (await fetchTemplates()) ?? templates;
      if (latest.some((t) => t.name === name)) {
        const ok = await confirm({
          title: `Replace template “${name}”?`,
          message: 'A template with this name already exists. Uploading will overwrite it for all future certificates (existing certificates are not changed).',
          confirmLabel: 'Replace template',
          tone: 'danger',
        });
        if (!ok) return;
      }

      const fd = new FormData();
      fd.append('file', templateFile);
      const res = await api.post('/certificates/templates', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const savedName = res.data?.name || name;
      setTemplateMsg({ tone: 'success', text: `Template “${savedName}” uploaded.` });
      setTemplateFile(null);
      setTemplateInputKey((k) => k + 1);
      await fetchTemplates();
      setSelectedTemplate(savedName);
    } catch (err) {
      setTemplateMsg({ tone: 'error', text: getErrorMessage(err, 'Template upload failed.') });
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (name) => {
    const ok = await confirm({
      title: `Delete template “${name}”?`,
      message: 'Certificates already generated with it are not affected.',
      confirmLabel: 'Delete template',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingTemplate(name);
    try {
      await api.delete(`/certificates/templates/${encodeURIComponent(name)}`);
      toast.success(`Template “${name}” deleted`);
      if (selectedTemplate === name) setSelectedTemplate('');
      await fetchTemplates();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the template.'));
    } finally {
      setDeletingTemplate('');
    }
  };

  // ── Certificate generation ───────────────────────────────────────────────
  const [productFile, setProductFile] = useState(null);
  const [productInputKey, setProductInputKey] = useState(0);
  const [productError, setProductError] = useState('');
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

  const onProductFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    const err = imageFileError(file, MAX_PHOTO_BYTES, 'Gemstone photo');
    setProductError(err);
    if (err) {
      setProductFile(null);
      setProductInputKey((k) => k + 1);
      return;
    }
    setProductFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
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
      setResult({ ...res.data, template: selectedTemplate });
      toast.success(`Certificate ${res.data?.certificate_code ?? ''} generated`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate the certificate. Check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const resultPdf = result ? pdfUrl(result.generated_image_path) : '';

  return (
    <Page title="Generate Certificate" description="Create a new gemstone identification certificate.">
      <div className="space-y-6">

        {/* ── Template management ─────────────────────────────────────── */}
        <Card title="Certificate Templates" subtitle="Upload named template images once, then reuse them from the list below.">
          <div className="space-y-4">
            <form onSubmit={handleUploadTemplate} className="flex flex-wrap gap-3 items-end">
              <Field
                label="Upload new template"
                htmlFor="cert-template-file"
                hint="PNG, JPG or WebP · max 15 MB. The file name becomes the template name, e.g. gemstone-portrait.png"
                className="min-w-[240px] flex-1"
              >
                <FileInput
                  id="cert-template-file"
                  key={templateInputKey}
                  accept={IMAGE_ACCEPT}
                  onChange={onTemplateFileChange}
                  disabled={uploadingTemplate}
                />
              </Field>
              <Button type="submit" disabled={!templateFile || uploadingTemplate} variant="outline">
                {uploadingTemplate ? 'Uploading…' : 'Upload template'}
              </Button>
            </form>

            {templateMsg && (
              <Alert tone={templateMsg.tone} onDismiss={() => setTemplateMsg(null)}>
                {templateMsg.text}
              </Alert>
            )}

            {templatesError ? (
              <Alert
                tone="error"
                action={<Button size="sm" variant="outline" onClick={fetchTemplates}>Retry</Button>}
              >
                {templatesError}
              </Alert>
            ) : templatesLoading && !templates.length ? (
              <p className="text-xs text-espresso/60">Loading templates…</p>
            ) : templates.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Certificate template">
                {templates.map((t) => {
                  const selected = selectedTemplate === t.name;
                  return (
                    <div
                      key={t.name}
                      className={cn(
                        'flex items-center rounded-lg border text-sm transition-colors',
                        selected
                          ? 'border-gold bg-gold/12 font-semibold text-gold-800'
                          : 'border-espresso/15 text-espresso hover:border-espresso/30',
                      )}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedTemplate(t.name)}
                        className="min-h-[36px] pl-3 pr-2 py-1.5"
                      >
                        {t.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.name)}
                        disabled={deletingTemplate === t.name}
                        aria-label={`Delete template ${t.name}`}
                        className="min-h-[36px] min-w-[32px] pr-3 pl-1 py-1.5 text-red-700 hover:text-red-800 text-xs leading-none disabled:opacity-40"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-espresso/60">No templates yet — upload one above.</p>
            )}
          </div>
        </Card>

        {/* ── Generate form + Preview ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          <Card
            title="Certificate Details"
            subtitle={selectedTemplate ? `Template: ${selectedTemplate}` : 'Select a template above first.'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Images */}
              <Field
                label="Gemstone photo (optional)"
                htmlFor="cert-photo"
                hint="Placed in the photo box on the certificate. PNG, JPG or WebP · max 8 MB."
                error={productError || undefined}
              >
                <FileInput id="cert-photo" key={productInputKey} accept={IMAGE_ACCEPT} onChange={onProductFileChange} />
              </Field>

              {/* Identification */}
              <div>
                <p className="text-xs font-semibold text-espresso/60 uppercase tracking-wide mb-2">Identification</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Certificate No" htmlFor="cert-certificate_no" hint="Auto-generated if left blank.">
                    <Input id="cert-certificate_no" name="certificate_no" value={fields.certificate_no} onChange={set('certificate_no')} placeholder="e.g. BJ-2025-001" />
                  </Field>
                  <Field label="Issue Date" htmlFor="cert-issue_date">
                    <Input id="cert-issue_date" name="issue_date" value={fields.issue_date} onChange={set('issue_date')} placeholder="e.g. 23 July 2025" />
                  </Field>
                  <Field label="Name of the Stone" htmlFor="cert-stone_name" className="sm:col-span-2">
                    <Input id="cert-stone_name" name="stone_name" value={fields.stone_name} onChange={set('stone_name')} placeholder="e.g. Ruby Corundum" />
                  </Field>
                </div>
              </div>

              {/* Left column properties */}
              <div>
                <p className="text-xs font-semibold text-espresso/60 uppercase tracking-wide mb-2">Left Column</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Colour" htmlFor="cert-colour">
                    <Input id="cert-colour" name="colour" value={fields.colour} onChange={set('colour')} placeholder="e.g. Deep Red" />
                  </Field>
                  <Field label="Shape" htmlFor="cert-shape">
                    <Input id="cert-shape" name="shape" value={fields.shape} onChange={set('shape')} placeholder="e.g. Oval" />
                  </Field>
                  <Field label="Transparency" htmlFor="cert-transparency">
                    <Input id="cert-transparency" name="transparency" value={fields.transparency} onChange={set('transparency')} placeholder="e.g. Transparent" />
                  </Field>
                  <Field label="Hardness" htmlFor="cert-hardness">
                    <Input id="cert-hardness" name="hardness" value={fields.hardness} onChange={set('hardness')} placeholder="e.g. 9 (Mohs)" />
                  </Field>
                  <Field label="Magnification" htmlFor="cert-magnification">
                    <Input id="cert-magnification" name="magnification" value={fields.magnification} onChange={set('magnification')} placeholder="e.g. 10×" />
                  </Field>
                  <Field label="Treatment" htmlFor="cert-treatment">
                    <Input id="cert-treatment" name="treatment" value={fields.treatment} onChange={set('treatment')} placeholder="e.g. Untreated / No Heat" />
                  </Field>
                </div>
              </div>

              {/* Right column properties */}
              <div>
                <p className="text-xs font-semibold text-espresso/60 uppercase tracking-wide mb-2">Right Column</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Weight" htmlFor="cert-weight">
                    <Input id="cert-weight" name="weight" value={fields.weight} onChange={set('weight')} placeholder="e.g. 3.45 Cts" />
                  </Field>
                  <Field label="Cut" htmlFor="cert-cut">
                    <Input id="cert-cut" name="cut" value={fields.cut} onChange={set('cut')} placeholder="e.g. Brilliant" />
                  </Field>
                  <Field label="RI (Refractive Index)" htmlFor="cert-ri">
                    <Input id="cert-ri" name="ri" value={fields.ri} onChange={set('ri')} placeholder="e.g. 1.762 – 1.770" />
                  </Field>
                  <Field label="Specific Gravity" htmlFor="cert-specific_gravity">
                    <Input id="cert-specific_gravity" name="specific_gravity" value={fields.specific_gravity} onChange={set('specific_gravity')} placeholder="e.g. 3.99 – 4.01" />
                  </Field>
                  <Field label="Observation" htmlFor="cert-observation">
                    <Input id="cert-observation" name="observation" value={fields.observation} onChange={set('observation')} placeholder="e.g. Natural, No Treatment" />
                  </Field>
                  <Field label="Origin" htmlFor="cert-origin">
                    <Input id="cert-origin" name="origin" value={fields.origin} onChange={set('origin')} placeholder="e.g. Burma / India" />
                  </Field>
                </div>
              </div>

              {/* Remarks & signatory */}
              <div>
                <p className="text-xs font-semibold text-espresso/60 uppercase tracking-wide mb-2">Remarks &amp; Signatory</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Remark" htmlFor="cert-remark" hint="Auto-wrapped inside the remark box on the certificate.">
                    <Input id="cert-remark" name="remark" value={fields.remark} onChange={set('remark')} placeholder="e.g. Certified Natural Gemstone" />
                  </Field>
                  <Field label="On Behalf Of" htmlFor="cert-on_behalf">
                    <Input id="cert-on_behalf" name="on_behalf" value={fields.on_behalf} onChange={set('on_behalf')} placeholder="Customer or company name" />
                  </Field>
                </div>
              </div>

              {/* Landscape-only fields */}
              <details className="text-xs text-espresso/60">
                <summary className="cursor-pointer font-semibold uppercase tracking-wide text-espresso/60 mb-2">Landscape template only ▸</summary>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-2">
                  <Field label="Size" htmlFor="cert-size">
                    <Input id="cert-size" name="size" value={fields.size} onChange={set('size')} placeholder="e.g. 8.2 × 6.1 mm" />
                  </Field>
                  <Field label="Report For" htmlFor="cert-report_for">
                    <Input id="cert-report_for" name="report_for" value={fields.report_for} onChange={set('report_for')} placeholder="Customer name" />
                  </Field>
                </div>
                <Field label="Free text" htmlFor="cert-free-text" hint="Extra notes appended on the landscape template." className="mt-3">
                  <Textarea id="cert-free-text" rows={2} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Additional notes..." />
                </Field>
              </details>

              {error && <Alert tone="error">{error}</Alert>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !selectedTemplate} className="flex-1">
                  {saving ? 'Generating…' : 'Generate Certificate'}
                </Button>
                <Button variant="outline" to="/admin/certificates">
                  View all
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Preview" subtitle="Generated certificate preview.">
            {result ? (
              <div className="space-y-3">
                <div className="text-xs text-espresso/80 space-y-1">
                  <div><span className="font-semibold">Code:</span> {result.certificate_code}</div>
                  <div><span className="font-semibold">Template:</span> {result.template}</div>
                  <div><span className="font-semibold">Created:</span> {formatDateTime(result.created_at)}</div>
                </div>
                {result.generated_image_path && (
                  <div>
                    <img
                      src={mediaUrl(result.generated_image_path)}
                      alt={`Certificate ${result.certificate_code}`}
                      className="border border-espresso/10 rounded-xl w-full object-contain max-h-96"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {resultPdf && (
                        <a
                          href={resultPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold/12 border border-gold/40 text-gold-800 text-xs font-semibold hover:bg-gold/20 transition-colors"
                        >
                          Open PDF (A4 print-ready)
                        </a>
                      )}
                      <a
                        href={mediaUrl(result.generated_image_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-espresso/70 font-medium hover:underline"
                      >
                        Open PNG
                      </a>
                    </div>
                    <p className="mt-2 text-[11px] text-espresso/60">Opens in a new tab — save or print it from there.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-espresso/60 py-8 text-center">
                Generate a certificate to see the preview here.
              </div>
            )}
          </Card>
        </div>

      </div>
    </Page>
  );
}
