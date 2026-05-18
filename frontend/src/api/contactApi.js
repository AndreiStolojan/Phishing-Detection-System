import apiClient from './apiClient.js';

export const sendContactMessage = ({ subject, message }) => {
    const normalizedSubject = String(subject ?? '').trim();

    return apiClient.post('/contact/message', {
        ...(normalizedSubject ? { subject: normalizedSubject } : {}),
        message: String(message ?? '').trim(),
    });
};

export default {
    sendContactMessage,
};
