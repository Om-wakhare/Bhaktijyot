import { useState } from 'react';
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
    } catch (err) {
      setError('Certificate not found or invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Verify Certificate</h1>
        <p className="text-sm text-gray-600">
          Enter the certificate code printed on your Bhaktijyot report to verify its authenticity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter certificate code"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-gray-700">
            <div>
              <span className="font-semibold">Certificate code:</span> {result.certificate_code}
            </div>
            <div>
              <span className="font-semibold">Issued at:</span>{' '}
              {new Date(result.created_at).toLocaleString()}
            </div>
          </div>

          {result.generated_image_path && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Certificate preview</div>
              <img
                src={mediaUrl(result.generated_image_path)}
                alt="Certificate"
                className="border border-gray-200 rounded-md max-h-80"
              />
              <div className="mt-2">
                <a
                  href={mediaUrl(result.generated_image_path)}
                  download
                  className="text-xs text-primary font-semibold"
                >
                  Download certificate image
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

