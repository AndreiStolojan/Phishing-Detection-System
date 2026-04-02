import { Router } from 'express';

import { login, logout, register } from "../controllers/auth.controller.js";

const authRouter = Router();

// Path: /api/v1/auth
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);

// Compatibilitate temporară cu naming-ul vechi
// authRouter.post('/sign-up', register);
// authRouter.post('/sign-in', login);
// authRouter.post('/sign-out', logout);

export default authRouter;
