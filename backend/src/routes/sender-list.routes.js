// ─────────────────────────────────────────────────────────────────────────────
// sender-list.routes.js — definește rutele HTTP pentru listele de expeditori ale
// userului (allowlist / blocklist).
//
// Ce face, pe scurt: leagă căile URL de funcțiile din
// sender-list.controller.js, validează datele de intrare cu Joi (din
// sender-list.validation.js) și cere autentificare (middleware-ul `authorize`
// verifică tokenul Bearer din header-ul Authorization).
//
// Rutele de aici sunt montate sub /api/v1/sender-lists (vezi router-ul principal).
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

import sendErrorResponse from '../common/http/send-error-response.js';
import authorize from '../middlewares/auth.middleware.js';
import {
    createSenderListEntry,
    deleteSenderListEntry,
    listSenderListEntries,
} from '../controllers/sender-list.controller.js';
import {
    createSenderListEntrySchema,
    senderListEntryParamsSchema,
} from '../validations/sender-list.validation.js';

const senderListRouter = Router();

// Middleware generic de validare: verifică `req[source]` (body sau params)
// cu schema Joi dată. Dacă datele sunt invalide, răspunde direct cu 400 și
// codul VALIDATION_ERROR (cererea nu mai ajunge la controller). Dacă sunt
// valide, înlocuiește `req[source]` cu valoarea "curățată" (ex. email
// normalizat cu litere mici) și continuă lanțul de middleware-uri.
const validateWith = (schema, source) => (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
        abortEarly: false, // colectează toate erorile, nu doar prima
        stripUnknown: true, // elimină câmpuri necunoscute din input
    });

    if (error) {
        const messages = error.details.map((detail) => detail.message);

        return sendErrorResponse(res, 400, 'Validation failed', 'VALIDATION_ERROR', messages);
    }

    req[source] = value;
    next();
};

// GET /sender-lists — listează regulile userului (opțional cu numărul de
// emailuri care se potrivesc fiecărei reguli, ?withMatchCounts=1).
senderListRouter.get('/', authorize, listSenderListEntries);
// POST /sender-lists — adaugă o regulă nouă (allow/block, sender/domeniu),
// după validarea body-ului cu createSenderListEntrySchema.
senderListRouter.post(
    '/',
    authorize,
    validateWith(createSenderListEntrySchema, 'body'),
    createSenderListEntry
);
// DELETE /sender-lists/:id — șterge o regulă, după validarea id-ului din URL
// (trebuie să fie un ObjectId Mongo valid).
senderListRouter.delete(
    '/:id',
    authorize,
    validateWith(senderListEntryParamsSchema, 'params'),
    deleteSenderListEntry
);

export default senderListRouter;
