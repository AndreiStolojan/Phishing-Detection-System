// ─────────────────────────────────────────────────────────────────────────────
// scheduler.service.js — pornește SARCINILE PROGRAMATE (cron jobs) ale aplicației.
//
// Ce face, pe scurt: la pornirea serverului, înregistrează DOUĂ joburi cu
// biblioteca node-cron (un "cron job" = o sarcină care rulează automat după un
// orar, ca un ceas deșteptător repetat):
//   1. Auto-sync — la fiecare SYNC_INTERVAL_MINUTES minute (implicit 15),
//      cheamă runAutoSyncForAllUsers din auto-sync.service.js.
//   2. Digest zilnic — rulează din oră în oră și trimite, fiecărui user a
//      cărui "oră de digest" coincide cu ora curentă (UTC), un rezumat al
//      activității din ultimele 24h (dacă a existat activitate).
//
// De ce node-cron și nu Gmail Push Notifications? Pentru un proiect de licență
// care nu se deployează public, polling-ul periodic e mai simplu de explicat
// și demonstrat (decizie acceptată — vezi docs/DECISIONS.md).
//
// Detalii: docs/EXPLICATIE_BACKEND.md §6.
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import mongoose from 'mongoose';
import { SYNC_INTERVAL_MINUTES } from '../config/env.js';
import { runAutoSyncForAllUsers } from './auto-sync.service.js';
import { getDailySummaryForUser } from './report.service.js';
import { sendDailyDigestEmail } from '../../extras/notifications/send-email.js';
import User from '../models/user.model.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';

// Citește SYNC_INTERVAL_MINUTES din env și îl validează: trebuie să fie un
// număr întreg între 1 și 60. Dacă valoarea e invalidă/lipsă, folosim 15
// minute implicit (valoarea recomandată din docs).
const parseSyncInterval = () => {
    const parsed = Number.parseInt(SYNC_INTERVAL_MINUTES, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
        return 15;
    }

    return parsed;
};

// Construiește expresia cron pentru auto-sync, în funcție de intervalul ales.
// O expresie cron are 5 câmpuri: minut oră zi-lună lună zi-săptămână.
// "*/15 * * * *" = "la fiecare 15 minute, în orice oră/zi/lună".
// Cazul special intervalMinutes === 1 ("* * * * *") e necesar pentru că
// "*/1" și "*" înseamnă același lucru, dar "*/1" nu e mereu acceptat la fel
// de toate librăriile — aici scriem explicit "*" pentru claritate.
const buildSyncCronExpression = (intervalMinutes) => {
    if (intervalMinutes === 1) {
        return '* * * * *';
    }

    return `*/${intervalMinutes} * * * *`;
};

// Verifică dacă userul a avut "activitate" în ultimele 24h: fie au apărut
// emailuri noi, fie un scan a dat un verdict riscant (suspicious/likely_phishing).
// Folosit ca să NU trimitem digest zilnic dacă nu s-a întâmplat nimic relevant.
const hasActivityInLast24h = async (userId) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    const [newEmails, riskyScans] = await Promise.all([
        Email.countDocuments({ userId: userObjectId, createdAt: { $gte: since } }),
        Scan.countDocuments({
            userId: userObjectId,
            verdict: { $in: ['suspicious', 'likely_phishing'] },
            scannedAt: { $gte: since },
        }),
    ]);

    return newEmails > 0 || riskyScans > 0;
};

// Ora implicită (UTC) la care se trimite digest-ul, dacă userul nu a ales alta.
const DEFAULT_DIGEST_HOUR = 8;

// Pentru un user: dacă a avut activitate în ultimele 24h, îi construiește
// rezumatul (getDailySummaryForUser) și îi trimite emailul de digest.
// Dacă nu a avut activitate, nu trimitem nimic (sent: false) — ca să nu
// spamăm userul cu rapoarte goale.
const sendDigestToUser = async (user) => {
    const hasActivity = await hasActivityInLast24h(user._id);

    if (!hasActivity) {
        return { sent: false };
    }

    const summary = await getDailySummaryForUser({ userId: user._id });

    return sendDailyDigestEmail({
        recipient: user.email,
        userName: user.name,
        summary,
    });
};

// Rulează digest-ul zilnic pentru ora curentă (UTC). Job-ul de cron rulează
// din oră în oră, iar aici filtrăm doar userii a căror "oră de digest" se
// potrivește cu ora curentă — așa fiecare user primește digest-ul o singură
// dată pe zi, la ora preferată de el.
const runDailyDigestForHour = async (currentHour) => {
    console.log(`[daily-digest] Starting digest run for hour ${currentHour} UTC`);

    const users = await User.find({
        $or: [
            { 'settings.digestEnabled': true, 'settings.digestHour': currentHour },
            { 'settings.digestEnabled': { $exists: false }, 'settings.digestHour': { $exists: false } },
            { 'settings.digestEnabled': { $exists: false }, 'settings.digestHour': currentHour },
            { 'settings.digestEnabled': true, 'settings.digestHour': { $exists: false } },
        ],
    }).select('email name settings').lean();

    // Filtrare: digestEnabled nu trebuie să fie explicit false, și digestHour
    // trebuie să coincidă cu ora curentă (sau, dacă userul n-a setat nimic,
    // se folosește DEFAULT_DIGEST_HOUR).
    const eligible = users.filter((u) => {
        const digestEnabled = u.settings?.digestEnabled;
        const digestHour = u.settings?.digestHour ?? DEFAULT_DIGEST_HOUR;
        if (digestEnabled === false) return false;
        return digestHour === currentHour;
    });

    if (eligible.length === 0) {
        console.log(`[daily-digest] No users scheduled for hour ${currentHour}, skipping`);
        return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of eligible) {
        try {
            const result = await sendDigestToUser(user);

            if (result.sent) {
                sentCount += 1;
            } else {
                skippedCount += 1;
            }
        } catch (error) {
            errorCount += 1;
            console.error('[daily-digest] Failed for user', {
                userId: String(user._id),
                error: error.message,
            });
        }
    }

    console.log('[daily-digest] Run complete', {
        hour: currentHour,
        eligible: eligible.length,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
    });
};

// Punctul de pornire: apelat o singură dată, la bootul serverului (vezi
// server/app entry point). Înregistrează cele două joburi cron descrise în
// header-ul fișierului. Erorile din interiorul joburilor sunt prinse aici —
// dacă un job pică, nu trebuie să oprească tot serverul.
export const startSchedulers = () => {
    const syncIntervalMinutes = parseSyncInterval();
    const syncCron = buildSyncCronExpression(syncIntervalMinutes);

    // Job 1: auto-sync — la fiecare `syncIntervalMinutes` minute, sincronizează
    // toate conturile Gmail active și scanează emailurile noi.
    cron.schedule(syncCron, async () => {
        console.log(`[auto-sync] Cron triggered (every ${syncIntervalMinutes} min)`);

        try {
            await runAutoSyncForAllUsers();
        } catch (error) {
            console.error('[auto-sync] Unhandled error in cron job', error.message);
        }
    });

    // Job 2: digest zilnic — rulează din oră în oră ("0 * * * *" = la minutul 0
    // al fiecărei ore) și trimite rezumatul userilor a căror oră de digest
    // coincide cu ora curentă (UTC).
    cron.schedule('0 * * * *', async () => {
        const currentHour = new Date().getUTCHours();
        console.log(`[daily-digest] Cron triggered (hour ${currentHour} UTC)`);

        try {
            await runDailyDigestForHour(currentHour);
        } catch (error) {
            console.error('[daily-digest] Unhandled error in cron job', error.message);
        }
    });

    console.log(`[scheduler] Auto-sync scheduled: every ${syncIntervalMinutes} minute(s)`);
    console.log('[scheduler] Daily digest scheduled: hourly, per-user digest hour (UTC)');
};
