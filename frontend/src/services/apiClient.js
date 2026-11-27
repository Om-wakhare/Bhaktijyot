import axios from 'axios';
import { tokenStore } from './tokenStore';

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.info('[apiClient] VITE_API_URL not set — using proxy path /api');
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      tokenStore.clear();
      if (window.location.pathname.startsWith('/admin') &&
          window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  },
);

/**
 * Turn any axios error into a human-readable message.
 * Handles FastAPI's string `detail`, Pydantic 422 arrays, and network/CORS failures.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (!err.response) {
    // Request never reached the server (offline, CORS, server down)
    return 'Could not reach the server. Please check your connection and try again.';
  }
  const detail = err.response.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '';
        const msg = (d?.msg || '').replace(/^Value error,\s*/i, '');
        return field ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean)
      .join(' · ');
  }
  if (err.response.status >= 500) return 'The server ran into a problem. Please try again in a moment.';
  return fallback;
}

export default api;
