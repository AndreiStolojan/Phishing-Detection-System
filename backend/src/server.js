import app from './app.js';
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';
import { startSchedulers } from './services/scheduler.service.js';

const startServer = async () => {
    try {
        await connectToDatabase();
        startSchedulers();

        app.listen(PORT, () => {
            console.log(`running api on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
