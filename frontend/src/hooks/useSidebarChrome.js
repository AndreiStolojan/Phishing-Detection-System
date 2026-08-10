// ─────────────────────────────────────────────────────────────────────────────
// useSidebarChrome.js — lăţimea şi starea (deschis/închis) ale sidebar-ului.
//
// Amândouă se ţin minte în localStorage: dacă cineva şi-a îngustat coloana sau
// a ascuns-o, e o preferinţă, nu ceva ce trebuie refăcut la fiecare refresh.
//
// Limitele nu sunt decorative: sub MIN_WIDTH eticheta "Confirmed phishing" se
// rupe pe două rânduri, iar peste MAX_WIDTH coloana începe să fure din lăţimea
// panoului de citire, care e partea unde chiar se lucrează.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 340;
export const SIDEBAR_DEFAULT_WIDTH = 212;

const STORAGE_KEY = 'secureinbox_sidebar';

export const clampSidebarWidth = (value) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));

const readStored = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

export function useSidebarChrome() {
  const [state, setState] = useState(() => {
    const stored = readStored();
    return {
      width: clampSidebarWidth(Number(stored.width) || SIDEBAR_DEFAULT_WIDTH),
      collapsed: Boolean(stored.collapsed),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota — the preference just won't persist */
    }
  }, [state]);

  const setWidth = useCallback((value) => {
    setState((prev) => ({ ...prev, width: clampSidebarWidth(value) }));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, collapsed: !prev.collapsed }));
  }, []);

  return { ...state, setWidth, toggleCollapsed };
}
