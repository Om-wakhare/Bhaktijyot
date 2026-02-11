const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function mediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}/${path.replace(/^\//, '')}`;
}
