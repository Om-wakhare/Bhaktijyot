import { useState } from 'react';
import { ShieldCheck, Search, Download } from 'lucide-react';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';

export function VerifyCertificatePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(code.trim())}`);
      setResult(res.data);
    } catch {
      setError('Certificate not found. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 space-y-8">
      <div className="text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Authenticity</div>
        <h1 className="font-display text-4xl font-semibold text-espresso">Verify Certificate</h1>
        <p className="text-sm text-warmBrown/60 max-w-sm mx-auto">
          Enter the certificate code printed on your Bhaktijyot report to instantly verify its authenticity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter certificate code (e.g. BJ-2024-3892)"
            className="w-full pl-11 pr-4 py-3.5 rounded-full border border-stone-200 text-sm text-warmBrown placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
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
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Verified banner */}
          <div className="bg-teal/10 border-b border-teal/20 px-6 py-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-teal shrink-0" />
            <div>
              <div className="text-sm font-semibold text-teal-dark">Certificate Verified</div>
              <div className="text-xs text-teal-dark/70">This certificate is authentic and issued by Bhaktijyot</div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">Certificate Code</div>
                <div className="font-semibold text-warmBrown font-mono">{result.certificate_code}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">Issued On</div>
                <div className="font-medium text-warmBrown">{new Date(result.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            {result.generated_image_path && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Certificate</div>
                <img
                  src={mediaUrl(result.generated_image_path)}
                  alt="Certificate"
                  className="w-full rounded-xl border border-stone-100"
                />
                <a
                  href={mediaUrl(result.generated_image_path)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Certificate
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
