// ─────────────────────────────────────────────────────────────────────────────
// AuthContext.jsx — cine e userul logat, partajat în toată aplicația.
//
// Ce face, pe scurt: un Context este o modalitate de a pune date "sus" în
// aplicație și a le citi din orice componentă de mai jos, fără să le pasăm
// manual din componentă în componentă (asta s-ar numi "prop drilling").
// AuthProvider ține token-ul, userul curent și starea de încărcare/eroare, și
// le expune prin AuthContext. AuthProvider înfășoară toată aplicația din
// main.jsx, deci orice pagină poate citi `useAuth()` și afla cine e userul.
//
// Mecanism: la pornire, dacă există un token salvat în localStorage, cerem
// GET /users/me ca să aflăm userul; dacă tokenul e invalid, îl ștergem și
// userul rămâne neautentificat. login/register cheamă API-ul, salvează
// tokenul și pun userul în stare. isAuthenticated = token + user prezente —
// pe el se bazează ProtectedRoute (paginile protejate).
//
// Detalii: docs/EXPLICATIE_FRONTEND.md §5.1.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/authApi.js';
import { getMe } from '../api/usersApi.js';
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/tokenStorage.js';

// Contextul propriu-zis — "cutia" în care stăm datele de autentificare.
// Componentele nu îl folosesc direct, ci prin hook-ul useAuth() (vezi useAuth.js).
export const AuthContext = createContext(null);

// AuthProvider — componenta "furnizor": ține starea de autentificare și o
// pune la dispoziția tuturor componentelor copil (`children`) prin Context.
export function AuthProvider({ children }) {
  // useState = "memoria" unei componente React: ține o valoare între
  // re-desenări și, când se schimbă (prin setToken/setUser/...), React
  // redesenează componenta și pe cele care citesc valoarea respectivă.
  // token: citit inițial din localStorage, ca userul să rămână logat după refresh.
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  // loading = true doar dacă există deja un token (atunci verificăm dacă mai e valid).
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const [error, setError] = useState(null);

  // refreshUser — (re)verifică userul curent față de backend folosind tokenul salvat.
  // useCallback memorează funcția între re-desenări, ca să nu se recreeze la
  // fiecare render (altfel useEffect de mai jos ar rula la nesfârșit, vezi mai jos).
  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();

    // Fără token salvat -> nu suntem logați, nu mai are sens să cerem /users/me.
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      // GET /users/me — confirmă tokenul și ne dă datele userului curent.
      const currentUser = await getMe();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch (err) {
      // Tokenul nu mai e valid (expirat/invalid) -> îl ștergem și considerăm userul delogat.
      clearStoredToken();
      setToken(null);
      setUser(null);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect = cod care rulează DUPĂ ce componenta s-a "desenat" (de obicei
  // pentru efecte secundare: apeluri către server, abonări etc.).
  // Aici: la prima montare a aplicației, verificăm dacă tokenul salvat e
  // încă valid și încărcăm userul curent.
  // Array-ul de dependențe [refreshUser] înseamnă: rulează din nou doar dacă
  // funcția refreshUser se schimbă — cum e memorată cu useCallback([]), practic
  // rulează o singură dată, la montare.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // completeAuth — pasul comun după login/register cu succes: salvează
  // tokenul (în localStorage + în stare) și userul primit de la backend.
  const completeAuth = useCallback((authResult) => {
    setStoredToken(authResult.token);
    setToken(authResult.token);
    setUser(authResult.user);
    setError(null);

    return authResult;
  }, []);

  // login — autentificare cu email/parolă: cheamă API-ul și salvează rezultatul.
  const login = useCallback(
    async (payload) => completeAuth(await authApi.login(payload)),
    [completeAuth]
  );

  // register — creează cont nou și îl autentifică imediat (la fel ca login).
  const register = useCallback(
    async (payload) => completeAuth(await authApi.register(payload)),
    [completeAuth]
  );

  // patchUser — actualizează local doar câmpuri din user (ex. după ce userul
  // își schimbă numele), fără să mai cerem tot obiectul de la server.
  const patchUser = useCallback((partial) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev);
  }, []);

  // logout — nu există "logout pe server"; pur și simplu ștergem tokenul
  // local. Fără token, următoarea cerere către backend va fi respinsă.
  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  // useMemo = recalculează obiectul `value` doar când se schimbă una din
  // dependențele din array-ul de mai jos, ca să nu forțăm re-render inutil
  // la toți consumatorii contextului la fiecare desenare a AuthProvider.
  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      // isAuthenticated: true doar dacă avem ȚI token, ȚI date despre user.
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser,
      patchUser,
    }),
    [error, loading, login, logout, patchUser, refreshUser, register, token, user]
  );

  // Provider-ul pune `value` la dispoziția tuturor componentelor din `children`.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
