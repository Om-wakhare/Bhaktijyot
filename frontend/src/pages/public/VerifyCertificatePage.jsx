import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Search, Download } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';

/* Gemstone fields we show from certificate_data, in display order (only those present). */
const CERT_FIELDS = [
  ['stone_name',       'Stone'],
  ['weight',           'Weight'],
  ['colour',           'Colour'],
  ['shape',            'Shape'],
  ['cut',              'Cut'],
  ['size',             'Size'],
  ['transparency',     'Transparency'],
  ['origin',           'Origin'],
  ['hardness',         'Hardness'],
  ['ri',               'Refractive Index (RI)'],
  ['specific_gravity', 'Specific Gravity'],
  ['magnification',    'Magnification'],
  ['observation',      'Observation'],
  ['treatment',        'Treatment'],
  ['remark',           'Remark'],
  ['issue_date',       'Issue Date'],
  ['certificate_no',   'Certificate No.'],
  ['report_for',       'Report For'],
];

function presentFields(data) {
  if (!data || typeof data !== 'object') return [];
  return CERT_FIELDS
    .map(([key, label]) => {
      const raw = data[key];
      if (raw === null || raw === undefined) return null;
      const value = typeof raw === 'object' ? '' : String(raw).trim();
      return value ? { key, label, value } : null;
    })
    .filter(Boolean);
}

export function VerifyCertificatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const codeParam = (searchParams.get('code') || '').trim();
  const inputId = useId();

  const [code, setCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const verify = useCallback(async (raw) => {
    const value = String(raw || '').trim();
    if (!value) return;
    const req = ++requestRef.current;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(value)}`);
      if (req === requestRef.current) setResult(res.data);
    } catch (err) {
      if (req !== requestRef.current) return;
      setError(
        err?.response?.status === 404
          ? 'Certificate not found. Please check the code and try again.'
          : getErrorMessage(err, 'We couldn’t verify the certificate right now. Please try again.'),
      );
    } finally {
      if (req === requestRef.current) setLoading(false);
    }
  }, []);

  // Deep links: /verify?code=XYZ verifies automatically
  useEffect(() => {
    if (!codeParam) return;
    setCode(codeParam);
    verify(codeParam);
  }, [codeParam, verify]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    if (value === codeParam) verify(value); // same code — the URL won't change, verify directly
    else setSearchParams({ code: value }, { replace: true }); // keeps the result shareable
  };

  const fields = result ? presentFields(result.certificate_data) : [];
  const freeText = typeof result?.free_text === 'string' ? result.free_text.trim() : '';
  const certImage = result?.generated_image_path ? mediaUrl(result.generated_image_path) : '';
  const stoneImage = result?.product_image_path ? mediaUrl(result.product_image_path) : '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-8">
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gold-dark">Authenticity</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">Verify Certificate</h1>
        <p className="text-sm text-espresso/65 max-w-sm mx-auto">
          Enter the certificate code printed on your Bhaktijyot report to instantly verify its authenticity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3" role="search">
        <div className="relative flex-1">
          <label htmlFor={inputId} className="sr-only">Certificate code</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-espresso/35 pointer-events-none" aria-hidden="true" />
          <input
            id={inputId}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter certificate code (e.g. BJ-2024-3892)"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full pl-11 pr-4 py-3.5 rounded-full border border-espresso/15 text-sm text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-7 py-3.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      {error && (
        <div role="alert" className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-800 text-sm rounded-2xl px-5 py-4">
          {error}
        </div>
      )}

      {result && (
        <section
          aria-labelledby="cert-verified-heading"
          className="bg-ivory border border-gold/30 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Verified banner */}
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center gap-3" role="status">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div>
              <h2 id="cert-verified-heading" className="text-sm font-semibold text-primary">Certificate Verified</h2>
              <div className="text-xs text-primary/80">This certificate is authentic and issued by Bhaktijyot</div>
            </div>
          </div>

          <div className={`p-6 grid gap-8 ${certImage ? 'md:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)]' : ''}`}>
            {/* Certificate image */}
            {certImage && (
              <div className="space-y-3">
                <a href={certImage} target="_blank" rel="noopener noreferrer" className="block" aria-label="Open certificate image in a new tab">
                  <img
                    src={certImage}
                    alt={`Bhaktijyot certificate ${result.certificate_code}`}
                    className="w-full rounded-xl border border-gold/30 bg-white"
                  />
                </a>
                <a
                  href={certImage}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download Certificate
                </a>
              </div>
            )}

            {/* Details */}
            <div className="space-y-5 min-w-0">
              <div className="flex items-start gap-4">
                {stoneImage && (
                  <img
                    src={stoneImage}
                    alt={fields.find((f) => f.key === 'stone_name')?.value || 'Certified gemstone'}
                    className="h-20 w-20 rounded-xl object-cover border border-gold/30 bg-white shrink-0"
                  />
                )}
                <dl className="grid grid-cols-2 gap-4 text-sm flex-1">
                  <div>
                    <dt className="text-xs text-espresso/55 uppercase tracking-wider mb-1">Certificate Code</dt>
                    <dd className="font-semibold text-espresso font-mono break-all">{result.certificate_code}</dd>
                  </div>
                  {result.created_at && (
                    <div>
                      <dt className="text-xs text-espresso/55 uppercase tracking-wider mb-1">Issued On</dt>
                      <dd className="font-medium text-espresso">
                        {new Date(result.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {fields.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dark mb-2">Gemstone Details</h3>
                  <dl className="divide-y divide-gold/20 border-y border-gold/20 text-sm">
                    {fields.map((f) => (
                      <div key={f.key} className="grid grid-cols-[minmax(0,2fr),minmax(0,3fr)] gap-3 py-2">
                        <dt className="text-espresso/60">{f.label}</dt>
                        <dd className="font-medium text-espresso break-words whitespace-pre-line">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {freeText && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dark mb-2">Notes</h3>
                  <p className="text-sm text-espresso/80 whitespace-pre-line leading-relaxed">{freeText}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
