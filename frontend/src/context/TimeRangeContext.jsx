import { createContext, useContext, useMemo, useState } from 'react';

import {
  formatRangeLabel,
  getDefaultRange,
  toISOWindow,
} from '@/lib/timeRange';

/*
  Owns the app-wide time-range filter. The From/To picker lives on the dashboard;
  every time-scoped view (dashboard stats, inbox, report) reads the same window
  from here so no two views ever show a different period. `from`/`to` are
  inclusive day boundaries (start-of-local-day Dates); the exposed ISO strings
  are the half-open [from, to) window the API expects. In-memory only — a full
  page refresh resets to the default (last 30 days).
*/
const TimeRangeContext = createContext(null);

export function TimeRangeProvider({ children }) {
  const [range, setRange] = useState(getDefaultRange);

  const value = useMemo(() => {
    const iso = toISOWindow(range);
    return {
      // Inclusive day boundaries (Dates) — for the picker inputs.
      fromDate: range.from,
      toDate: range.to,
      setRange,
      label: formatRangeLabel(range),
      // ISO strings, ready to pass as ?from=&to= query params.
      from: iso.from,
      to: iso.to,
    };
  }, [range]);

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  const context = useContext(TimeRangeContext);
  if (!context) {
    throw new Error('useTimeRange must be used inside TimeRangeProvider.');
  }
  return context;
}
