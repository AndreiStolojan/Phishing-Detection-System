import { Router } from 'express';
import {
    disconnectMailAccount,
    getMailAccounts,
    handleGoogleCallback,
    startGoogleConnect,
} from '../controllers/mail-account.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const mailAccountRouter = Router();

mailAccountRouter.get('/google/start', authorize, startGoogleConnect);
mailAccountRouter.get('/google/callback', handleGoogleCallback);
mailAccountRouter.get('/', authorize, getMailAccounts);
mailAccountRouter.delete('/:id', authorize, disconnectMailAccount);

export default mailAccountRouter;
