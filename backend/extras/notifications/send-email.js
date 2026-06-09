import { EMAIL_FROM, SUPPORT_EMAIL } from '../../src/config/env.js';
import {
    monthlyDigestTemplate,
    dailyDigestTemplate,
    phishingAlertTemplate,
} from './email.template.js';
import welcomeTemplate from './email.template.js';
import {
    createEmailTransporter,
    getMissingEmailConfig,
} from './nodemailer.js';

const buildMissingEmailConfigResult = ({ recipient, period, generatedAt }) => {
    const missing = getMissingEmailConfig();

    if (missing.length === 0) {
        return null;
    }

    return {
        sent: false,
        recipient,
        period,
        generatedAt,
        error: {
            code: 'EMAIL_CONFIG_MISSING',
            message: `Configurarea pentru email lipsește: ${missing.join(', ')}.`,
            missing,
        },
    };
};

const buildMissingContactEmailConfigResult = ({ recipient, generatedAt }) => {
    const missing = getMissingEmailConfig();

    if (missing.length === 0) {
        return null;
    }

    return {
        sent: false,
        recipient,
        generatedAt,
        error: {
            code: 'EMAIL_CONFIG_MISSING',
            message: `Email configuration is missing: ${missing.join(', ')}.`,
            missing,
        },
    };
};

const escapeHtml = (value) =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const formatContactMessageHtml = ({ userName, userEmail, subject, message, generatedAt }) => `
    <h2>New contact message</h2>
    <p><strong>From:</strong> ${escapeHtml(userName)} (${escapeHtml(userEmail)})</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</p>
    <hr>
    <p>${escapeHtml(message).replaceAll('\n', '<br>')}</p>
`;

export const sendWelcomeEmail = async ({ email, userName }) => {
    if (!email) {
        throw new Error('Email is required');
    }

    if (!userName) {
        throw new Error('User name is required');
    }

    const createdAt = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const { subject, html } = welcomeTemplate(userName, createdAt);

    const mailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject,
        html
    };

    const missingConfig = buildMissingEmailConfigResult({
        recipient: email,
        period: null,
        generatedAt: new Date().toISOString(),
    });

    if (missingConfig) {
        throw new Error(missingConfig.error.message);
    }

    const transporter = createEmailTransporter();
    const info = await transporter.sendMail(mailOptions);

    return { success: true, messageId: info.messageId };
};

export const sendMonthlyDigestEmail = async ({ recipient, userName, summary }) => {
    if (!recipient) {
        throw new Error('Recipient email is required');
    }

    if (!summary) {
        throw new Error('Monthly summary is required');
    }

    const missingConfig = buildMissingEmailConfigResult({
        recipient,
        period: summary.period,
        generatedAt: summary.generatedAt,
    });

    if (missingConfig) {
        return missingConfig;
    }

    const { subject, html } = monthlyDigestTemplate({
        summary,
        userName: userName || recipient,
    });

    const transporter = createEmailTransporter();
    const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: recipient,
        subject,
        html,
    });

    return {
        sent: true,
        messageId: info.messageId,
        recipient,
        period: summary.period,
        generatedAt: summary.generatedAt,
    };
};

export const sendDailyDigestEmail = async ({ recipient, userName, summary }) => {
    if (!recipient) {
        throw new Error('Recipient email is required');
    }

    if (!summary) {
        throw new Error('Daily summary is required');
    }

    const missingConfig = buildMissingEmailConfigResult({
        recipient,
        period: summary.period,
        generatedAt: summary.generatedAt,
    });

    if (missingConfig) {
        return missingConfig;
    }

    const { subject, html } = dailyDigestTemplate({
        summary,
        userName: userName || recipient,
    });

    const transporter = createEmailTransporter();
    const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: recipient,
        subject,
        html,
    });

    return {
        sent: true,
        messageId: info.messageId,
        recipient,
        period: summary.period,
        generatedAt: summary.generatedAt,
    };
};

export const sendContactMessageEmail = async ({ userName, userEmail, subject, message }) => {
    const generatedAt = new Date().toISOString();
    const recipient = SUPPORT_EMAIL;
    const missingConfig = buildMissingContactEmailConfigResult({
        recipient,
        generatedAt,
    });

    if (missingConfig) {
        return missingConfig;
    }

    const safeSubject = subject || 'Support message';
    const transporter = createEmailTransporter();

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: SUPPORT_EMAIL,
            replyTo: userEmail,
            subject: `[Contact] ${safeSubject}`,
            text: [
                'New contact message',
                `From: ${userName} <${userEmail}>`,
                `Subject: ${safeSubject}`,
                `Generated at: ${generatedAt}`,
                '',
                message,
            ].join('\n'),
            html: formatContactMessageHtml({
                userName,
                userEmail,
                subject: safeSubject,
                message,
                generatedAt,
            }),
        });

        return {
            sent: true,
            recipient: SUPPORT_EMAIL,
            messageId: info.messageId,
            generatedAt,
        };
    } catch (error) {
        return {
            sent: false,
            recipient: SUPPORT_EMAIL,
            generatedAt,
            error: {
                code: 'EMAIL_SEND_FAILED',
                message: 'Contact email could not be sent.',
                detail: error.message,
            },
        };
    }
};

export const sendPhishingAlertEmail = async ({ recipient, userName, emails }) => {
    if (!recipient) {
        throw new Error('Recipient email is required');
    }

    const missing = getMissingEmailConfig();

    if (missing.length > 0) {
        return {
            sent: false,
            recipient,
            error: {
                code: 'EMAIL_CONFIG_MISSING',
                message: `Email configuration is missing: ${missing.join(', ')}.`,
                missing,
            },
        };
    }

    const detectedAt = new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });
    const { subject, html } = phishingAlertTemplate({ userName, emails, detectedAt });
    const transporter = createEmailTransporter();
    const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: recipient,
        subject,
        html,
    });

    return {
        sent: true,
        messageId: info.messageId,
        recipient,
    };
};
