const KEY = 'bj_admin_token';

export const tokenStore = {
  get: () => window.sessionStorage.getItem(KEY),
  set: (t) => window.sessionStorage.setItem(KEY, t),
  clear: () => window.sessionStorage.removeItem(KEY),
};
