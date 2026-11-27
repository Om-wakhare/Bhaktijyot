import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../services/auth';
import { getErrorMessage } from '../../services/apiClient';

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

export function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('That username or password is not correct. Please check and try again.');
      } else if (status === 429) {
        // Per-IP throttle on the server: wait for the window to pass, then try again
        setError(getErrorMessage(err, 'Too many failed login attempts. Please wait a few minutes and try again.'));
      } else {
        // Network / CORS / server errors are not a credentials problem
        setError(getErrorMessage(err, 'Could not sign in right now. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-espresso p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(201,168,76,0.12),transparent_60%)]" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-espresso-600 border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <SparkleIcon />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-white leading-tight">Bhaktijyot</div>
              <div className="text-[10px] text-white/65 uppercase tracking-widest font-medium">Admin Panel</div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-white/70 mb-7">Sign in to access the admin dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-xs font-semibold text-white/75 mb-2">Username</label>
              <input
                id="admin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin"
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/45 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold transition-all"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-white/75 mb-2">Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/45 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-xs text-red-200 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gold text-espresso text-sm font-bold hover:bg-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-600 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-white/55">
          Bhaktijyot Admin · Private access only
        </p>
      </div>
    </div>
  );
}
