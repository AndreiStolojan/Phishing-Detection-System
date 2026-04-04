import { Router } from 'express';

import { login, logout, register } from "../controllers/auth.controller.js";
import validate from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';

const authRouter = Router();

// Path: /api/v1/auth
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/logout', logout);

// Compatibilitate temporară cu naming-ul vechi
// authRouter.post('/sign-up', register);
// authRouter.post('/sign-in', login);
// authRouter.post('/sign-out', logout);

export default authRouter;
