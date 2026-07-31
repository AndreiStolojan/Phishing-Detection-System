// ─────────────────────────────────────────────────────────────────────────────
// email.model.js — modelul Mongoose pentru un EMAIL sincronizat din Gmail.
//
// Ce face, pe scurt: definește forma (schema) unui document din colecția
// "emails". Un document = un email adus de la Gmail, cu toate informațiile
// extrase la sincronizare (expeditor, subiect, corp, linkuri, atașamente) +
// verdictul manual dat de user (mark safe / mark phishing).
//
// De ce sunt salvate câmpuri "calculate" (ex. senderDomain, linkCount,
// suspiciousLinkPatterns)? Ca scanarea să fie rapidă: nu reparsăm emailul brut
// de fiecare dată, ci extragem semnalele o singură dată, la sincronizare, și
// le ținem gata de folosit de scan.service.js.
//
// Detalii: docs/EXPLICATIE_BACKEND.md §3.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';

// Sub-schemă (schemă "îmbricată", folosită ca tip pentru un câmp din schema
// principală) pentru ultima eroare apărută când am încercat o acțiune pe Gmail
// (ex. mutarea emailului în spam). `_id: false` = MongoDB nu mai creează un
// id separat pentru acest sub-document, fiindcă nu are nevoie să fie căutat
// independent.
const providerActionErrorSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            default: null,
            trim: true,
        },
        message: {
            type: String,
            default: null,
            trim: true,
        },
    },
    {
        _id: false,
    }
);

const AUTH_RESULT_VALUES = [
    'pass',
    'fail',
    'softfail',
    'neutral',
    'none',
    'temperror',
    'permerror',
];

const authenticationMethodSchema = new mongoose.Schema(
    {
        result: { type: String, enum: AUTH_RESULT_VALUES, default: 'none' },
        domain: { type: String, default: null, trim: true, lowercase: true },
        source: {
            type: String,
            enum: ['gmail_header', 'local_verify', 'local_evaluate'],
            required: true,
        },
    },
    { _id: false }
);

const dkimSignatureSchema = new mongoose.Schema(
    {
        result: { type: String, enum: AUTH_RESULT_VALUES, default: 'none' },
        domain: { type: String, default: null, trim: true, lowercase: true },
        selector: { type: String, default: null, trim: true },
        aligned: { type: Boolean, default: false },
    },
    { _id: false }
);

const emailAuthResultsSchema = new mongoose.Schema(
    {
        spf: { type: authenticationMethodSchema, default: null },
        dkim: {
            result: { type: String, enum: AUTH_RESULT_VALUES, default: 'none' },
            domain: { type: String, default: null, trim: true, lowercase: true },
            selector: { type: String, default: null, trim: true },
            aligned: { type: Boolean, default: false },
            source: {
                type: String,
                enum: ['local_verify', 'gmail_header'],
                default: 'local_verify',
            },
            signatures: { type: [dkimSignatureSchema], default: [] },
        },
        dmarc: {
            result: { type: String, enum: AUTH_RESULT_VALUES, default: 'none' },
            policy: { type: String, enum: ['reject', 'quarantine', 'none'], default: null },
            alignment: { type: String, enum: ['strict', 'relaxed', 'none'], default: 'none' },
            source: {
                type: String,
                enum: ['local_evaluate'],
                default: 'local_evaluate',
            },
        },
        arc: {
            result: { type: String, enum: AUTH_RESULT_VALUES, default: 'none' },
            chainLength: { type: Number, min: 0, default: 0 },
        },
        evaluatedAt: { type: Date, default: null },
        status: {
            type: String,
            enum: ['ok', 'partial', 'unavailable'],
            default: 'unavailable',
        },
        failureReason: { type: String, default: null, trim: true, maxlength: 180 },
    },
    { _id: false }
);

const emailSchema = new mongoose.Schema(
    {
        // ── Legături către alte colecții ──────────────────────────────────
        // "ref" + ObjectId = o referință (legătură) către un document din altă
        // colecție, ca o cheie externă (foreign key) din bazele relaționale.
        // "index: true" = MongoDB ține o structură de căutare rapidă pe acest
        // câmp, ca să găsească rapid emailurile unui user / cont.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        mailAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MailAccount',
            required: true,
            index: true,
        },

        // ── Identificare la furnizor (Gmail) ──────────────────────────────
        // "enum" = lista valorilor permise; momentan doar Gmail e suportat.
        provider: {
            type: String,
            enum: ['gmail'],
            required: true,
            default: 'gmail',
        },
        // Id-ul mesajului așa cum îl dă Gmail. Folosit (împreună cu userId)
        // ca să nu salvăm același email de două ori (vezi indexul unic mai jos).
        providerMessageId: {
            type: String,
            required: true,
            trim: true,
        },
        threadId: {
            type: String,
            default: null,
        },

        // ── Antet (header) email: subiect, expeditor, destinatar ──────────
        subject: {
            type: String,
            default: '',
            trim: true,
        },
        from: {
            type: String,
            default: '',
            trim: true,
        },
        to: {
            type: String,
            default: '',
            trim: true,
        },
        replyTo: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        displayName: {
            type: String,
            default: '',
            trim: true,
        },
        // senderDomain / replyToDomain = domeniul extras din "from" / "replyTo"
        // (ex. "exemplu.com"). Calculat la sincronizare, ca regulile de scanare
        // să nu mai trebuiască să-l extragă din nou de fiecare dată.
        senderDomain: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        replyToDomain: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },

        // ── Conținutul emailului ──────────────────────────────────────────
        snippet: {
            type: String,
            default: '',
        },
        textBody: {
            type: String,
            default: '',
        },
        htmlBody: {
            type: String,
            default: '',
        },

        // ── Semnale despre linkuri, calculate la sincronizare ─────────────
        // links = toate URL-urile găsite în email; linkDomains = domeniile lor
        // unice; linkCount = câte linkuri sunt; hasShortenedUrl = dacă există
        // un link de tip "shortener" (ex. bit.ly); suspiciousLinkPatterns =
        // tipare suspecte găsite în linkuri (folosite de regulile de scor).
        links: {
            type: [String],
            default: [],
        },
        linkDomains: {
            type: [String],
            default: [],
        },
        linkCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        hasShortenedUrl: {
            type: Boolean,
            default: false,
        },
        suspiciousLinkPatterns: {
            type: [String],
            default: [],
        },

        // ── Atașamente ─────────────────────────────────────────────────────
        // Doar extensiile fișierelor atașate (ex. "exe", "zip"), nu fișierele
        // în sine — sunt suficiente pentru regulile de scor.
        attachmentExtensions: {
            type: [String],
            default: [],
        },

        // Rezultatele autentificării sunt derivate la sincronizare; MIME-ul brut
        // folosit pentru DKIM/ARC este eliminat imediat și nu ajunge în MongoDB.
        authResults: {
            type: emailAuthResultsSchema,
            default: null,
        },

        // ── Date despre sincronizare ──────────────────────────────────────
        receivedAt: {
            type: Date,
            default: null,
        },
        // De unde vine emailul: prima sincronizare a contului, sau o
        // sincronizare manuală ulterioară.
        syncSource: {
            type: String,
            enum: ['gmail_initial_sync', 'gmail_manual_sync'],
            default: null,
        },

        // ── Verdictul manual al userului (review) ─────────────────────────
        // userVerdict = ce a decis userul după ce a citit emailul: e sigur
        // sau e phishing. reviewedAt = când a marcat. lastManualAction =
        // ultima acțiune făcută (utilă pt. istoric/UI).
        userVerdict: {
            type: String,
            enum: ['safe', 'phishing'],
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        lastManualAction: {
            type: String,
            enum: ['mark_safe', 'mark_phishing'],
            default: null,
        },

        // ── Acțiuni trimise către Gmail (ex. mutare în spam) ──────────────
        // Aceste câmpuri țin minte ultima acțiune trimisă către Gmail, dacă a
        // reușit/a eșuat/a fost omisă, când s-a întâmplat și (dacă a eșuat)
        // detaliile erorii (din sub-schema definită mai sus).
        lastProviderAction: {
            type: String,
            enum: ['gmail_move_to_spam'],
            default: null,
        },
        lastProviderActionStatus: {
            type: String,
            enum: ['success', 'failed', 'skipped'],
            default: null,
        },
        lastProviderActionAt: {
            type: Date,
            default: null,
        },
        lastProviderActionError: {
            type: providerActionErrorSchema,
            default: null,
        },

        // ── Date brute, pentru depanare (debug) ───────────────────────────
        // "Mixed" = poate fi orice tip de date (obiect, listă etc.), Mongoose
        // nu îi validează structura. Folosit ca să ținem header-ele brute ale
        // emailului pentru investigații, fără să forțăm o schemă strictă.
        rawHeaders: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    {
        // timestamps: true => Mongoose adaugă automat createdAt și updatedAt.
        timestamps: true,
    }
);

// ── Indexuri ────────────────────────────────────────────────────────────────
// Un index = o structură suplimentară pe care MongoDB o ține ca să găsească
// rapid documentele după anumite câmpuri, fără să le parcurgă pe toate.

// Index UNIC pe (userId, providerMessageId): garantează că nu pot exista două
// emailuri cu același id de la Gmail pentru același user. Astfel, re-sincro-
// nizarea aceluiași email îl actualizează, nu îl duplică.
emailSchema.index({ userId: 1, providerMessageId: 1 }, { unique: true });

// Index pentru listarea emailurilor unui user, sortate descrescător după
// data primirii (cele mai noi primele) — exact ce afișează inboxul.
emailSchema.index({ userId: 1, receivedAt: -1 });

const Email = mongoose.model('Email', emailSchema);

export default Email;
