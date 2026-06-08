import { Router } from 'express';

import { login, register } from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import arcjetMiddleware from '../../extras/security/arcjet.middleware.js';

const authRouter = Router();

// Path: /api/v1/auth
authRouter.post('/register', arcjetMiddleware, validate(registerSchema), register);
authRouter.post('/login', arcjetMiddleware, validate(loginSchema), login);


export default authRouter;
