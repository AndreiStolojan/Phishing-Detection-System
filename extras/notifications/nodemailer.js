import nodemailer from 'nodemailer';

import { EMAIL_FROM, EMAIL_PASSWORD } from '../../config/env.js';

export const getMissingEmailConfig = () => {
    const missing = [];

    if (!EMAIL_FROM) {
        missing.push('EMAIL_FROM');
    }

    if (!EMAIL_PASSWORD) {
        missing.push('EMAIL_PASSWORD');
    }

    return missing;
};

export const createEmailTransporter = () =>
    nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_FROM,
            pass: EMAIL_PASSWORD,
        },
    });

const transporter = createEmailTransporter();

export default transporter;
