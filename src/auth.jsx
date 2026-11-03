import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SESSION_EXPIRED_EVENT, clearToken, decodeToken, getToken, isTokenExpired, saveToken } from './api';

const AuthContext = createContext(null);

function readStoredToken() {
  const token = getToken();
  if (token && isTokenExpired(token)) {
    clearToken();
    return null;
  }
  return token;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [sessionExpired, setSessionExpired] = useState(false);
  const session = useMemo(() => (token ? decodeToken(token) : null), [token]);

  const login = useCallback((newToken) => {
    saveToken(newToken);
    setToken(newToken);
    setSessionExpired(false);
  }, []);

  const logout = useCallback((reason) => {
    clearToken();
    setToken(null);
    setSessionExpired(reason === 'expired');
  }, []);

  // A API respondeu 401 a uma chamada autenticada.
  useEffect(() => {
    const handleExpired = () => logout('expired');
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [logout]);

  // Encerra a sessão no horário de expiração do JWT, sem esperar uma chamada falhar.
  useEffect(() => {
    if (!session?.expiresAt) return undefined;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      logout('expired');
      return undefined;
    }
    const timer = setTimeout(() => logout('expired'), Math.min(remaining, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [session, logout]);

  const value = useMemo(
    () => ({ token, email: session?.email ?? null, sessionExpired, login, logout }),
    [token, session, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

export function RequireAuth({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/admin" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}
