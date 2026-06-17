// ─────────────────────────────────────────────────────────────────────────────
// tokenStorage.js — salvează/citește/șterge tokenul de autentificare (JWT).
//
// Ce face, pe scurt: aplicația ține tokenul de login (JWT) în localStorage-ul
// browserului, sub cheia "secureinbox_token". De aici îl citește la fiecare
// cerere către API (pus în headerul Authorization: Bearer <token>) și tot de
// aici e șters la logout (logout-ul e doar pe frontend — backend-ul nu are
// un endpoint de logout, pur și simplu "uităm" tokenul local).
//
// Detalii: docs/EXPLICATIE_FRONTEND.md §4.3.
// ─────────────────────────────────────────────────────────────────────────────

// Cheia sub care e salvat tokenul în localStorage.
const TOKEN_KEY = 'secureinbox_token';

// Verifică dacă suntem într-un mediu unde localStorage e disponibil
// (ex: în testele care rulează în Node, fără browser, window/localStorage nu există).
const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

// Citește tokenul salvat. Returnează null dacă nu există sau dacă nu avem
// acces la localStorage.
export const getStoredToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
};

// Salvează tokenul în localStorage (apelat după login/register cu succes).
export const setStoredToken = (token) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
};

// Șterge tokenul din localStorage (apelat la logout — singurul "logout" care
// există e ștergerea tokenului local, backend-ul nu invalidează nimic).
export const clearStoredToken = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
};
