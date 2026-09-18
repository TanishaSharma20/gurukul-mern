import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setSessionExpiredHandler } from '../api/axios';
import { setAccessToken, clearAccessToken } from '../api/tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, ask the API who we are. If the access token is
  // missing/expired but a valid refresh-token cookie still exists, the
  // axios response interceptor transparently refreshes and this still
  // succeeds - the user never sees a login screen unnecessarily.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    setSessionExpiredHandler(() => setUser(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async ({ name, email, password, role }) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Best-effort - even if this call fails we still clear local state.
    }
    clearAccessToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
