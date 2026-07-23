import { useCallback } from 'react';
import api from './apiClient';
import { tokenStore } from './tokenStore';

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getToken() { return tokenStore.get(); }
export function setToken(token) { tokenStore.set(token); }
export function clearToken() { tokenStore.clear(); }

export function isTokenValid() {
  const token = tokenStore.get();
  if (!token) return false;
  const exp = decodeExpiry(token);
  if (exp === null) return true;
  return Date.now() < exp;
}

export function useAuth() {
  const isAuthenticated = useCallback(() => isTokenValid(), []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    tokenStore.set(res.data.access_token);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
  }, []);

  return { isAuthenticated, login, logout };
}
