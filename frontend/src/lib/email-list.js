/**
 * The list endpoint may return an array or an envelope with items/pagination.
 * Normalise both into a plain array of emails.
 */
export function normalizeEmailList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items || data.emails || data.results || [];
}

export function getPaginationTotal(data, fallback) {
  if (Array.isArray(data)) return data.length;
  return data?.pagination?.total ?? data?.total ?? fallback;
}
