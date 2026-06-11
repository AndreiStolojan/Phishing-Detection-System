import createError from '../errors/create-error.js';

/*
 * Shared parser for the optional `from`/`to` query params that scope an
 * endpoint to an absolute time window (the app's global time-range filter).
 * The frontend computes the window in the user's local timezone and sends
 * absolute ISO timestamps, so the backend never does timezone math — it only
 * compares instants. The window is half-open: [from, to).
 *
 * Returns { from: Date, to: Date } when both params are present, or null when
 * neither is, so callers can fall back to their legacy scoping (`days`,
 * `month`, all-time). Providing only one bound is rejected: a half-specified
 * window is a client bug, not an intent.
 */
export const parseDateRangeQuery = (query = {}) => {
    const rawFrom = query.from;
    const rawTo = query.to;

    if (rawFrom === undefined && rawTo === undefined) {
        return null;
    }

    if (rawFrom === undefined || rawTo === undefined) {
        throw createError(
            'Invalid date range',
            400,
            ['from and to must be provided together.'],
            'INVALID_DATE_RANGE'
        );
    }

    const from = new Date(rawFrom);
    const to = new Date(rawTo);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw createError(
            'Invalid date range',
            400,
            ['from and to must be valid ISO 8601 dates.'],
            'INVALID_DATE_RANGE'
        );
    }

    if (from.getTime() >= to.getTime()) {
        throw createError(
            'Invalid date range',
            400,
            ['from must be earlier than to.'],
            'INVALID_DATE_RANGE'
        );
    }

    return { from, to };
};
