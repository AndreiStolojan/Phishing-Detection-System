import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/authApi.js';
import { getMe } from '../api/usersApi.js';
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/tokenStorage.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();

    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const currentUser = await getMe();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch (err) {
      clearStoredToken();
      setToken(null);
      setUser(null);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const completeAuth = useCallback((authResult) => {
    setStoredToken(authResult.token);
    setToken(authResult.token);
    setUser(authResult.user);
    setError(null);

    return authResult;
  }, []);

  const login = useCallback(
    async (payload) => completeAuth(await authApi.login(payload)),
    [completeAuth]
  );

  const register = useCallback(
    async (payload) => completeAuth(await authApi.register(payload)),
    [completeAuth]
  );

  const patchUser = useCallback((partial) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser,
      patchUser,
    }),
    [error, loading, login, logout, patchUser, refreshUser, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
