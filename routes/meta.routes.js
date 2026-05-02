import { Router } from 'express';

import { getMetaStatus } from '../controllers/meta.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const metaRouter = Router();

metaRouter.get('/status', authorize, getMetaStatus);

export default metaRouter;
