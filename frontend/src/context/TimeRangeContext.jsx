import { createContext, useContext, useMemo, useState } from 'react';

import {
  DEFAULT_TIME_RANGE_PRESET,
  TIME_RANGE_PRESETS,
  computeRange,
  getPresetLabel,
} from '@/lib/timeRange';

/*
  Owns the app-wide time-range filter. The picker lives on the dashboard;
  every time-scoped view (dashboard stats, inbox, report) reads { from, to }
  from here so no two views ever show a different period. In-memory only —
  a full page refresh resets to the default preset.
*/
const TimeRangeContext = createContext(null);

export function TimeRangeProvider({ children }) {
  const [preset, setPreset] = useState(DEFAULT_TIME_RANGE_PRESET);

  const value = useMemo(() => {
    const { from, to } = computeRange(preset);
    return {
      preset,
      setPreset,
      presets: TIME_RANGE_PRESETS,
      label: getPresetLabel(preset),
      // ISO strings, ready to be passed as ?from=&to= query params.
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, [preset]);

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  const context = useContext(TimeRangeContext);
  if (!context) {
    throw new Error('useTimeRange must be used inside TimeRangeProvider.');
  }
  return context;
}
