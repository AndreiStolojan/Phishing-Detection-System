import app from './app.js';
import mongoose from 'mongoose';
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';
import { startSchedulers } from './services/scheduler.service.js';
import {
    drainGmailPushQueue,
    stopGmailPushQueue,
} from './services/gmail-push-runtime.service.js';

const startServer = async () => {
    try {
        await connectToDatabase();
        const schedulers = startSchedulers();

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`running api on http://0.0.0.0:${PORT}`);
        });

        const shutdown = (signal) => {
            console.log(`${signal} received; shutting down gracefully`);
            schedulers.stop();
            stopGmailPushQueue();

            server.close(async () => {
                try {
                    await drainGmailPushQueue();
                    await mongoose.disconnect();
                } finally {
                    process.exit(0);
                }
            });

            setTimeout(() => process.exit(1), 10000).unref();
        };

        process.once('SIGTERM', () => shutdown('SIGTERM'));
        process.once('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
