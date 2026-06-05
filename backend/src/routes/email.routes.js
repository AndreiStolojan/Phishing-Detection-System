import { Router } from 'express';

import authorize from '../middlewares/auth.middleware.js';
import {
    getEmailById,
    getEmailRawById,
    getEmails,
    getEmailStats,
} from '../controllers/email.controller.js';

const emailRouter = Router();

emailRouter.get('/', authorize, getEmails);
emailRouter.get('/stats', authorize, getEmailStats);
emailRouter.get('/:id/raw', authorize, getEmailRawById);
emailRouter.get('/:id', authorize, getEmailById);

export default emailRouter;
