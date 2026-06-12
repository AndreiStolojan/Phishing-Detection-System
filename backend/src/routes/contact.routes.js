import { Router } from 'express';

import { sendContactMessage } from '../controllers/contact.controller.js';
import authorize from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { contactMessageSchema } from '../validations/contact.validation.js';

const contactRouter = Router();

contactRouter.post('/message', authorize, validate(contactMessageSchema), sendContactMessage);

export default contactRouter;
