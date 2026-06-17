// ─────────────────────────────────────────────────────────────────────────────
// useApi.js — hook propriu de CITIRE date, cu loading/error și cache opțional.
//
// Ce face, pe scurt: un "hook propriu" (custom hook) e o funcție al cărei
// nume începe cu `use` și care împachetează un comportament reutilizabil
// (aici: "cheamă API-ul, ține `data`/`loading`/`error`, re-cheamă când se
// schimbă ceva"), ca paginile să nu repete aceeași logică de fiecare dată.
//
// `useApi(fetcher, deps, cacheKey)`:
// - `fetcher` = funcție async care aduce datele (de obicei un apel din api/...).
// - `deps`    = array de dependențe (ca la useEffect): când una se schimbă
//   (ex. se schimbă `syncVersion` sau intervalul de timp), datele se reîncarcă automat.
// - `cacheKey` (opțional) = un șir unic pentru cererea asta; activează cache-ul
//   de mai jos (stale-while-revalidate).
//
// Stale-while-revalidate: dacă există deja o valoare în cache pentru `cacheKey`,
// la revenirea pe pagină se arată INSTANT datele vechi (fără spinner), iar pe
// fundal se face un refetch care actualizează datele când răspunsul vine.
//
// Detalii: docs/EXPLICATIE_FRONTEND.md §4.4.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

// Cache la nivel de modul (nu de componentă!) — partajat de TOATE instanțele
// hook-ului, cât ține sesiunea (se pierde la refresh de pagină).
// Cheie: cacheKey (șir)  →  Valoare: ultimul răspuns primit cu succes.
const cache = new Map();

/**
 * Small data-fetching hook with optional stale-while-revalidate cache.
 *
 * Pass a stable string as the third argument to enable caching.
 * On revisit the cached value is shown immediately (no spinner) while a
 * background refetch silently updates the data.
 *
 * @param {() => Promise<any>} fetcher   async function that returns data
 * @param {Array}              deps      re-fetch when these change
 * @param {string}             [cacheKey] unique key for this request
 */
export function useApi(fetcher, deps = [], cacheKey = null) {
  // Dacă avem deja o valoare în cache pentru acest cacheKey, o folosim ca
  // valoare INIȚIALĂ — astfel utilizatorul vede imediat datele vechi.
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  const hasCached = cached !== undefined;

  // useState = "memoria" hook-ului: data (rezultatul), loading (se încarcă?),
  // error (mesaj de eroare, dacă a picat cererea).
  const [data, setData] = useState(hasCached ? cached : null);
  // Dacă avem deja date din cache, nu mai pornim cu spinner-ul activ.
  const [loading, setLoading] = useState(!hasCached);
  const [error, setError] = useState(null);
  // Ținem ultima versiune a lui `fetcher` într-un ref (nu re-creează re-render),
  // ca `load` de mai jos să poată folosi mereu fetcher-ul curent fără să fie
  // nevoie să-l punem în array-ul de dependențe (ar invalida memorarea cu useCallback).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // load — funcția care face efectiv cererea. Memorată cu useCallback pe
  // `deps` (dependențele primite de la apelant): se recreează doar când se
  // schimbă acestea, ceea ce declanșează useEffect-ul de mai jos -> reîncărcare.
  const load = useCallback(async () => {
    // Arătăm spinner-ul de încărcare doar dacă nu avem deja date în cache
    // pentru acest cacheKey (altfel afișăm datele vechi cât se reîmprospătează).
    if (!cache.has(cacheKey)) setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (cacheKey) cache.set(cacheKey, result);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to load data.');
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // useEffect: rulează DUPĂ desenare. [load] ca dependență înseamnă: rulează
  // din nou de fiecare dată când `load` se recreează — adică atunci când se
  // schimbă una din `deps` primite (ex. syncVersion, from/to). Așa se
  // declanșează automat reîncărcarea datelor.
  useEffect(() => {
    load();
  }, [load]);

  // reload = expunem `load` cu alt nume, ca paginile să poată reîncărca
  // manual (ex. după o acțiune). setData permite și actualizări optimiste.
  return { data, loading, error, reload: load, setData };
}

/** Call this after a mutation to bust specific cached keys. */
// bustCache — golește din cache cheile date explicit. Se apelează după o
// modificare (ex. mark as safe), ca următoarea citire să nu mai arate
// datele vechi din cache.
export function bustCache(...keys) {
  keys.forEach((k) => cache.delete(k));
}

/** Bust every cached key that starts with one of the given prefixes. */
// bustCacheByPrefix — golește din cache toate cheile care încep cu unul din
// prefixele date (util când nu știm cheia exactă, ex. toate cheile "/emails...").
export function bustCacheByPrefix(...prefixes) {
  for (const key of cache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) cache.delete(key);
  }
}
