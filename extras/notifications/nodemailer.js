import nodemailer from 'nodemailer';

import { EMAIL_PASSWORD } from '../../config/env.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'andreistolojan@gmail.com',
        pass: EMAIL_PASSWORD
    }
});

export default transporter;
