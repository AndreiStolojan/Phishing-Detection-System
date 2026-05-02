import { EMAIL_FROM } from '../../config/env.js';
import {
    monthlyDigestTemplate,
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

export const sendWelcomeEmail = async ({ email, userName }) => {
    if (!email) {
        throw new Error('Email is required');
    }

    if (!userName) {
        throw new Error('User name is required');
    }

    const createdAt = new Date().toLocaleDateString('ro-RO', {
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
