import { sendContactMessageEmail } from '../../extras/notifications/send-email.js';

const DEFAULT_CONTACT_SUBJECT = 'Support message';

const normalizeSubject = (subject) => {
    if (typeof subject !== 'string') {
        return DEFAULT_CONTACT_SUBJECT;
    }

    const trimmedSubject = subject.trim().replace(/\s+/g, ' ');

    return trimmedSubject || DEFAULT_CONTACT_SUBJECT;
};

export const sendContactMessageForUser = async ({ user, payload }) => {
    try {
        return await sendContactMessageEmail({
            userName: user.name,
            userEmail: user.email,
            subject: normalizeSubject(payload.subject),
            message: payload.message,
        });
    } catch (error) {
        return {
            sent: false,
            recipient: null,
            generatedAt: new Date().toISOString(),
            error: {
                code: 'EMAIL_SEND_FAILED',
                message: 'Contact email could not be sent.',
                detail: error.message,
            },
        };
    }
};
