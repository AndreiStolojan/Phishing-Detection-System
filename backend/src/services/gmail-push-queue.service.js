const DEFAULT_DEBOUNCE_MS = 2_500;
const DEFAULT_DUPLICATE_TTL_MS = 10 * 60 * 1_000;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_CAPACITY = 1_000;

const requirePositiveInteger = (value, name) => {
    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`${name} must be a positive integer`);
    }
    return value;
};

const requireNonEmptyString = (value, name) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${name} must be a non-empty string`);
    }
    return value;
};

/**
 * Coalesces Gmail push notifications before asking the existing sync pipeline
 * to process an account.  The queue intentionally knows nothing about Gmail
 * history cursors: Gmail notifications are hints, and the T3 sync lock/state
 * machine remains the authority for ordering and deduplication.
 */
export const createGmailPushQueue = ({
    sync,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    duplicateTtlMs = DEFAULT_DUPLICATE_TTL_MS,
    concurrency = DEFAULT_CONCURRENCY,
    capacity = DEFAULT_CAPACITY,
    clock = () => Date.now(),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    onError = () => {},
} = {}) => {
    if (typeof sync !== 'function') {
        throw new TypeError('sync must be a function');
    }
    requirePositiveInteger(debounceMs, 'debounceMs');
    requirePositiveInteger(duplicateTtlMs, 'duplicateTtlMs');
    requirePositiveInteger(concurrency, 'concurrency');
    requirePositiveInteger(capacity, 'capacity');
    if (typeof clock !== 'function' || typeof setTimeoutFn !== 'function' || typeof clearTimeoutFn !== 'function') {
        throw new TypeError('clock and timer functions must be functions');
    }

    const accounts = new Map();
    const seenMessageIds = new Map();
    const runnableAccountIds = [];
    const drainWaiters = new Set();
    let accepting = true;
    let activeCount = 0;

    const now = () => Number(clock());

    const pruneSeenMessageIds = () => {
        const currentTime = now();
        for (const [messageId, expiresAt] of seenMessageIds) {
            if (expiresAt <= currentTime) seenMessageIds.delete(messageId);
        }
    };

    const isDrained = () => activeCount === 0 && runnableAccountIds.length === 0 && [...accounts.values()]
        .every((state) => !state.timer && !state.running && !state.ready && !state.pending);

    const notifyDrained = () => {
        if (!isDrained()) return;
        for (const resolve of drainWaiters) resolve();
        drainWaiters.clear();
    };

    const removeIfIdle = (accountId, state) => {
        if (!state.timer && !state.running && !state.ready && !state.pending) {
            accounts.delete(accountId);
        }
    };

    const addRunnable = (accountId, state) => {
        if (state.running || !state.ready || state.queued) return;
        state.queued = true;
        runnableAccountIds.push(accountId);
    };

    const pump = () => {
        while (activeCount < concurrency && runnableAccountIds.length > 0) {
            const accountId = runnableAccountIds.shift();
            const state = accounts.get(accountId);
            if (!state) continue;
            state.queued = false;
            if (state.running || !state.ready) continue;

            state.ready = false;
            state.pending = false;
            const notificationReceivedAt = state.pendingSince;
            state.pendingSince = null;
            state.running = true;
            activeCount += 1;

            Promise.resolve()
                .then(() => sync({ mailAccountId: accountId, notificationReceivedAt }))
                .catch((error) => onError({ mailAccountId: accountId, error }))
                .finally(() => {
                    state.running = false;
                    activeCount -= 1;
                    // A timer may have elapsed while sync was in progress. In
                    // that case its ready flag already represents exactly one
                    // follow-up execution.
                    addRunnable(accountId, state);
                    removeIfIdle(accountId, state);
                    pump();
                    notifyDrained();
                });
        }
        notifyDrained();
    };

    const markReadyAfterDebounce = (accountId, state) => {
        state.timer = null;
        state.ready = true;
        addRunnable(accountId, state);
        pump();
    };

    const enqueue = ({ mailAccountId, messageId, notificationReceivedAt }) => {
        requireNonEmptyString(mailAccountId, 'mailAccountId');
        requireNonEmptyString(messageId, 'messageId');
        const receivedAtMs = notificationReceivedAt instanceof Date
            ? notificationReceivedAt.getTime()
            : now();
        if (!Number.isFinite(receivedAtMs)) {
            throw new TypeError('notificationReceivedAt must be a valid Date');
        }
        if (!accepting) return { accepted: false, reason: 'stopped' };

        pruneSeenMessageIds();
        if (seenMessageIds.has(messageId)) return { accepted: false, reason: 'duplicate' };
        seenMessageIds.set(messageId, now() + duplicateTtlMs);

        let state = accounts.get(mailAccountId);
        if (!state) {
            if (accounts.size >= capacity) {
                seenMessageIds.delete(messageId);
                return { accepted: false, reason: 'capacity' };
            }
            state = {
                timer: null,
                pending: false,
                pendingSince: null,
                ready: false,
                queued: false,
                running: false,
            };
            accounts.set(mailAccountId, state);
        }

        state.pending = true;
        state.pendingSince = state.pendingSince === null
            ? receivedAtMs
            : Math.min(state.pendingSince, receivedAtMs);
        if (state.timer) clearTimeoutFn(state.timer);
        state.timer = setTimeoutFn(() => markReadyAfterDebounce(mailAccountId, state), debounceMs);
        return { accepted: true };
    };

    const stopAccepting = () => {
        accepting = false;
        for (const [accountId, state] of accounts) {
            if (!state.timer) continue;
            clearTimeoutFn(state.timer);
            state.timer = null;
            state.ready = true;
            addRunnable(accountId, state);
        }
        pump();
    };

    const drain = () => {
        if (isDrained()) return Promise.resolve();
        return new Promise((resolve) => drainWaiters.add(resolve));
    };

    const getState = () => ({
        accepting,
        activeCount,
        queuedCount: runnableAccountIds.length,
        accountCount: accounts.size,
        seenMessageCount: seenMessageIds.size,
    });

    return { enqueue, stopAccepting, drain, getState };
};
