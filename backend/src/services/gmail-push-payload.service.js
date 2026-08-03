const MAX_EMAIL_ADDRESS_LENGTH = 254;
const MAX_HISTORY_ID_LENGTH = 20;
const MAX_MESSAGE_ID_LENGTH = 256;
const CANONICAL_BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const HISTORY_ID_PATTERN = /^\d+$/;
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPlainObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export class GmailPushPayloadError extends Error {
    constructor() {
        super('Invalid Gmail push payload');
        this.name = 'GmailPushPayloadError';
        this.statusCode = 400;
        this.code = 'GMAIL_PUSH_PAYLOAD_INVALID';
    }
}

const invalidPayload = () => {
    throw new GmailPushPayloadError();
};

const decodeCanonicalBase64 = (value) => {
    if (
        typeof value !== 'string' ||
        value.length === 0 ||
        value.length % 4 !== 0 ||
        !CANONICAL_BASE64_PATTERN.test(value)
    ) {
        return invalidPayload();
    }

    const decoded = Buffer.from(value, 'base64');

    if (decoded.toString('base64') !== value) {
        return invalidPayload();
    }

    return decoded;
};

const decodeUtf8 = (value) => {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(value);
    } catch {
        return invalidPayload();
    }
};

const parseJsonObject = (value) => {
    try {
        const parsed = JSON.parse(value);

        if (!isPlainObject(parsed)) {
            return invalidPayload();
        }

        return parsed;
    } catch {
        return invalidPayload();
    }
};

export const parseGmailPushPayload = (envelope) => {
    if (
        !isPlainObject(envelope) ||
        !Object.hasOwn(envelope, 'message') ||
        !isPlainObject(envelope.message) ||
        !Object.hasOwn(envelope.message, 'data') ||
        !Object.hasOwn(envelope.message, 'messageId')
    ) {
        return invalidPayload();
    }

    const notification = parseJsonObject(
        decodeUtf8(decodeCanonicalBase64(envelope.message.data))
    );
    const rawEmailAddress = notification.emailAddress;
    const rawHistoryId = notification.historyId;
    const messageId = envelope.message.messageId;

    if (
        typeof rawEmailAddress !== 'string' ||
        rawEmailAddress.length > MAX_EMAIL_ADDRESS_LENGTH ||
        typeof messageId !== 'string' ||
        messageId.length === 0 ||
        messageId.length > MAX_MESSAGE_ID_LENGTH ||
        !(
            (typeof rawHistoryId === 'string' &&
                rawHistoryId.length > 0 &&
                rawHistoryId.length <= MAX_HISTORY_ID_LENGTH &&
                HISTORY_ID_PATTERN.test(rawHistoryId)) ||
            (typeof rawHistoryId === 'number' &&
                Number.isFinite(rawHistoryId) &&
                Number.isInteger(rawHistoryId) &&
                rawHistoryId >= 0)
        )
    ) {
        return invalidPayload();
    }

    const emailAddress = rawEmailAddress.trim().toLowerCase();

    if (
        emailAddress.length === 0 ||
        emailAddress.length > MAX_EMAIL_ADDRESS_LENGTH ||
        !EMAIL_ADDRESS_PATTERN.test(emailAddress)
    ) {
        return invalidPayload();
    }

    return { emailAddress, historyId: String(rawHistoryId), messageId };
};
