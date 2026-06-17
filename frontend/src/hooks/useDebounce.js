// ─────────────────────────────────────────────────────────────────────────────
// useDebounce.js — hook generic de "debounce" (întârzie o valoare).
//
// Ce face, pe scurt: întoarce o versiune "întârziată" a valorii primite —
// se actualizează doar după ce valoarea NU s-a mai schimbat timp de `delay`
// milisecunde. Folosit, de exemplu, la căutare: așteptăm ~300ms după ce
// userul s-a oprit din tastat înainte de a trimite cererea către API, ca să
// nu facem o cerere la fiecare literă apăsată.
//
// Detalii: docs/EXPLICATIE_FRONTEND.md §4.4.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

export function useDebounce(value, delay = 300) {
  // debounced = valoarea "întârziată", returnată de hook.
  const [debounced, setDebounced] = useState(value);
  // timerRef ține referința la setTimeout-ul curent, ca să-l putem anula
  // dacă `value` se schimbă din nou înainte să expire.
  const timerRef = useRef(null);

  // De fiecare dată când `value` (sau `delay`) se schimbă: anulăm timer-ul
  // anterior (dacă există) și pornim unul nou. Dacă `value` se schimbă des
  // și rapid (ex. la fiecare apăsare de tastă), doar ultima valoare "supraviețuiește"
  // și ajunge în `debounced`, după `delay` ms de la ultima schimbare.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    // Funcția de cleanup: rulează la următoarea schimbare sau la demontare,
    // ca să nu rămână timere "atârnate" care actualizează o componentă disparută.
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}
