import nodemailer from "nodemailer";
import { EMAIL_PASSWORD } from "../config/env.js";
import welcomeTemplate from "./email.template.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'andreistolojan@gmail.com',
        pass: EMAIL_PASSWORD
    }
});

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
        from: 'andreistolojan@gmail.com',
        to: email,
        subject: subject,
        html: html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email de bun venit trimis:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Eroare la trimiterea emailului:', error);
        throw error;
    }
};