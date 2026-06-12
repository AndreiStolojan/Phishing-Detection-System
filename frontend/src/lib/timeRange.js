/*
  Global time-range filter — the pure date math behind a custom From/To window.
  The user picks two calendar days (From and To) on the dashboard; both days are
  INCLUSIVE. Boundaries are computed in the user's LOCAL timezone and sent to the
  API as absolute ISO timestamps (?from=&to=), so the backend never does timezone
  math. The wire window is half-open [from, to): the exclusive end is advanced one
  day past the To day so the To day itself is included.
*/

const DAY_MS = 24 * 60 * 60 * 1000;

// Size of the default window: the last 30 days, ending today.
export const DEFAULT_RANGE_DAYS = 30;

const startOfLocalDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Default range seed — last 30 days ending today (both inclusive day
 * boundaries). `from`/`to` are start-of-local-day Dates.
 */
export const getDefaultRange = (now = new Date()) => {
  const to = startOfLocalDay(now);
  const from = new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  return { from, to };
};

/**
 * Absolute half-open [from, to) ISO window for the API. `from`/`to` are the
 * inclusive From/To day boundaries; the To day is included by advancing the
 * exclusive end one full day past it.
 */
export const toISOWindow = ({ from, to }) => ({
  from: startOfLocalDay(from).toISOString(),
  to: new Date(startOfLocalDay(to).getTime() + DAY_MS).toISOString(),
});

/** Human-readable label, e.g. "May 13 – Jun 12, 2026" (year shown once). */
export const formatRangeLabel = ({ from, to }) => {
  const fmt = (date, opts) => new Intl.DateTimeFormat('en', opts).format(date);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromOpts = sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  const toOpts = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${fmt(from, fromOpts)} – ${fmt(to, toOpts)}`;
};

/** A local Date → the "yyyy-MM-dd" value a native <input type="date"> expects. */
export const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** A native date input "yyyy-MM-dd" value → a local start-of-day Date (or null). */
export const fromDateInputValue = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};
