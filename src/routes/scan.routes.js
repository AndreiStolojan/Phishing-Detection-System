import { Router } from 'express';

import authorize from '../middlewares/auth.middleware.js';
import {
    getLatestEmailScan,
    scanEmail,
} from '../controllers/scan.controller.js';

const scanRouter = Router();

scanRouter.post('/emails/:emailId', authorize, scanEmail);
scanRouter.get('/emails/:emailId/latest', authorize, getLatestEmailScan);

export default scanRouter;
