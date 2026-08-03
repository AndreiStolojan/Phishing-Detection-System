// Gmail Watch lifecycle is kept separate from the sync cursor. Gmail push
// notifications are only a prompt to run the T3 incremental synchronizer;
// they never authoritatively advance lastHistoryId.

const parseWatchResponse = ({ response, now }) => {
    const expirationMs = Number(response?.expiration);
    const watchHistoryId = response?.historyId;
    const expiration = new Date(expirationMs);

    if (
        !Number.isFinite(expirationMs) ||
        Number.isNaN(expiration.getTime()) ||
        expirationMs <= now.getTime()
    ) {
        throw new Error('Gmail Watch response did not include a future expiration');
    }
    if (typeof watchHistoryId !== 'string' && typeof watchHistoryId !== 'number') {
        throw new Error('Gmail Watch response did not include a historyId');
    }

    return {
        expiration,
        watchHistoryId: String(watchHistoryId),
    };
};

const requireFunction = (value, name) => {
    if (typeof value !== 'function') {
        throw new TypeError(`${name} must be a function`);
    }
    return value;
};

// The factory has no imports from mail-account.service.js. The OAuth-aware
// request functions are injected by that service, avoiding a circular import
// while retaining its encrypted-token refresh behavior for Watch and Stop.
export const createGmailWatchService = ({
    model,
    requestWatch,
    requestStop,
    topicName,
    enabled = false,
    now = () => new Date(),
} = {}) => {
    if (!model?.updateOne) {
        throw new TypeError('model.updateOne must be a function');
    }
    requireFunction(requestWatch, 'requestWatch');
    requireFunction(requestStop, 'requestStop');
    requireFunction(now, 'now');

    const ensure = async ({ mailAccount }) => {
        if (!enabled) {
            return { configured: false, skipped: true, reason: 'push_not_configured' };
        }
        if (!topicName) {
            throw new Error('Gmail Watch topicName is required when Push is enabled');
        }
        if (!mailAccount?._id) {
            throw new TypeError('mailAccount with _id is required');
        }

        const renewedAt = now();
        if (!(renewedAt instanceof Date) || Number.isNaN(renewedAt.getTime())) {
            throw new TypeError('now must return a valid Date');
        }
        const response = await requestWatch({ mailAccount, topicName });
        const { expiration, watchHistoryId } = parseWatchResponse({ response, now: renewedAt });

        await model.updateOne(
            { _id: mailAccount._id },
            {
                $set: {
                    watchExpiration: expiration,
                    watchHistoryId,
                    watchRegisteredAt: renewedAt,
                    watchStatus: 'active',
                    watchFailureCount: 0,
                },
            }
        );

        return {
            configured: true,
            skipped: false,
            expiration,
            watchHistoryId,
        };
    };

    const stop = async ({ mailAccount }) => {
        if (!mailAccount?._id) {
            throw new TypeError('mailAccount with _id is required');
        }

        // Without locally recorded Watch state there is nothing this release
        // can safely stop. Stop remains available even if Push config was later
        // removed, because it only needs the user OAuth grant.
        if (!mailAccount.watchExpiration) {
            return { skipped: true, reason: 'watch_not_registered' };
        }

        await requestStop({ mailAccount });
        await model.updateOne(
            { _id: mailAccount._id },
            {
                $set: {
                    watchExpiration: null,
                    watchHistoryId: null,
                    watchRegisteredAt: null,
                    watchStatus: 'disabled',
                    watchFailureCount: 0,
                },
            }
        );

        return { skipped: false, stopped: true };
    };

    return { ensure, stop };
};
