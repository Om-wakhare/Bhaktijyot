import { useCallback } from 'react';
import api from './apiClient';

const TOKEN_KEY = 'bj_admin_token';

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function useAuth() {
  const isAuthenticated = useCallback(() => {
    return Boolean(getToken());
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setToken(res.data.access_token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
  }, []);

  return { isAuthenticated, login, logout };
}

