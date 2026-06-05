import { useCallback, useEffect, useRef, useState } from 'react';

// Module-level cache shared across all hook instances for the lifetime of the session.
// Key: cacheKey string  →  Value: last successful response.
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
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  const hasCached = cached !== undefined;

  const [data, setData] = useState(hasCached ? cached : null);
  const [loading, setLoading] = useState(!hasCached);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    // Only show the full-page spinner when there is no cached data yet.
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

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

/** Call this after a mutation to bust specific cached keys. */
export function bustCache(...keys) {
  keys.forEach((k) => cache.delete(k));
}

/** Bust every cached key that starts with one of the given prefixes. */
export function bustCacheByPrefix(...prefixes) {
  for (const key of cache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) cache.delete(key);
  }
}
