// ─────────────────────────────────────────────────────────────────────────────
// meta.routes.js — definește ruta HTTP sub `/api/v1/meta`.
//
// Ce face, pe scurt: o singură rută — statusul userului curent (counts +
// flags), folosită de frontend la încărcarea aplicației pentru a decide
// ce să arate (ex. mesaj "conectează-ți Gmail").
//
// Detalii: docs/EXPLICATIE_BACKEND.md §2 (route -> middleware -> controller).
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

import { getMetaStatus } from '../controllers/meta.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const metaRouter = Router();

// authorize verifică token-ul JWT și pune userul pe req.user.
metaRouter.get('/status', authorize, getMetaStatus);

export default metaRouter;
