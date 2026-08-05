import sendErrorResponse from '../common/http/send-error-response.js';
import {
    GmailPushPayloadError,
    parseGmailPushPayload,
} from '../services/gmail-push-payload.service.js';

export const createGmailPushWebhookHandler = ({
    findActiveMailAccountsByEmail,
    enqueueNotification,
    now = () => new Date(),
    onResult = () => {},
} = {}) => {
    if (typeof findActiveMailAccountsByEmail !== 'function') {
        throw new TypeError('findActiveMailAccountsByEmail must be a function');
    }

    if (typeof enqueueNotification !== 'function') {
        throw new TypeError('enqueueNotification must be a function');
    }

    return async (req, res, next) => {
        let notification;

        try {
            notification = parseGmailPushPayload(req.body);
        } catch (error) {
            if (error instanceof GmailPushPayloadError) {
                onResult('rejected');
                return sendErrorResponse(
                    res,
                    400,
                    'Invalid Gmail push payload',
                    'GMAIL_PUSH_PAYLOAD_INVALID'
                );
            }

            return next(error);
        }

        try {
            const mailAccounts = await findActiveMailAccountsByEmail(notification.emailAddress);

            if (!Array.isArray(mailAccounts) || mailAccounts.length === 0) {
                onResult('unknown_account');
                return res.status(200).json({ success: true });
            }

            const notificationReceivedAt = now();
            const enqueueResults = await Promise.all(mailAccounts.map((mailAccount) =>
                enqueueNotification({
                    mailAccountId: String(mailAccount._id),
                    messageId: `${notification.messageId}:${mailAccount._id}`,
                    historyId: notification.historyId,
                    notificationReceivedAt,
                })));

            if (
                enqueueResults.some((result) =>
                    result?.accepted === false && result.reason !== 'duplicate')
            ) {
                onResult('rejected');
                return sendErrorResponse(
                    res,
                    503,
                    'Gmail push processing is temporarily unavailable',
                    'GMAIL_PUSH_QUEUE_UNAVAILABLE'
                );
            }

            onResult(
                enqueueResults.every((result) => result?.reason === 'duplicate')
                    ? 'duplicate'
                    : 'processed'
            );

            return res.status(200).json({ success: true });
        } catch (error) {
            return next(error);
        }
    };
};
