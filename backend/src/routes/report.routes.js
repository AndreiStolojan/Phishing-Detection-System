// ─────────────────────────────────────────────────────────────────────────────
// report.routes.js — definește rutele HTTP pentru rapoarte.
//
// Ce face, pe scurt: leagă căile URL de funcțiile din report.controller.js.
// Toate rutele cer autentificare (middleware-ul `authorize` verifică tokenul
// Bearer din header-ul Authorization).
//
// Rutele de aici sunt montate sub /api/v1/reports (vezi router-ul principal).
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

import {
    getMonthlySummary,
    sendMonthlySummary,
} from '../controllers/report.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const reportRouter = Router();

// GET /reports/monthly-summary — citește rezumatul periodic (pentru dashboard).
reportRouter.get('/monthly-summary', authorize, getMonthlySummary);
// POST /reports/monthly-summary/send — calculează rezumatul și îl trimite pe email.
reportRouter.post('/monthly-summary/send', authorize, sendMonthlySummary);

export default reportRouter;
