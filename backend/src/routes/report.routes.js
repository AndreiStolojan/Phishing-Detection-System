import { Router } from 'express';

import {
    getMonthlySummary,
    sendMonthlySummary,
} from '../controllers/report.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const reportRouter = Router();

reportRouter.get('/monthly-summary', authorize, getMonthlySummary);
reportRouter.post('/monthly-summary/send', authorize, sendMonthlySummary);

export default reportRouter;
