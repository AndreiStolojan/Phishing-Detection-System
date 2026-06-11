/*
  Global time-range filter — the preset definitions and the pure date math
  behind them. Boundaries are computed in the user's LOCAL timezone and sent
  to the API as absolute ISO timestamps (?from=&to=), so the backend never
  does timezone math. Windows are half-open: [from, to).
*/

export const TIME_RANGE_PRESETS = [
  { key: 'last_day', label: 'Last day' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_30_days', label: 'Last 30 days' },
  { key: 'last_90_days', label: 'Last 90 days' },
  { key: 'last_month', label: 'Last month' },
];

export const DEFAULT_TIME_RANGE_PRESET = 'last_30_days';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getPresetLabel = (presetKey) =>
  TIME_RANGE_PRESETS.find((preset) => preset.key === presetKey)?.label || '';

/**
 * Absolute [from, to) window for a preset, in local time.
 * - last_day: rolling 24 hours ending now (distinct from "Yesterday").
 * - yesterday / last_month: the previous full calendar day / month.
 * - last_30_days / last_90_days: rolling windows ending now.
 */
export const computeRange = (presetKey, now = new Date()) => {
  switch (presetKey) {
    case 'last_day':
      return { from: new Date(now.getTime() - DAY_MS), to: now };
    case 'yesterday': {
      const todayStart = startOfLocalDay(now);
      return { from: new Date(todayStart.getTime() - DAY_MS), to: todayStart };
    }
    case 'last_90_days':
      return { from: new Date(now.getTime() - 90 * DAY_MS), to: now };
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case 'last_30_days':
    default:
      return { from: new Date(now.getTime() - 30 * DAY_MS), to: now };
  }
};
