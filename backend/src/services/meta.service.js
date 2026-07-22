// ─────────────────────────────────────────────────────────────────────────────
// meta.service.js — status general pentru userul curent (un mic "tablou de bord").
//
// Ce face, pe scurt: oferă un singur endpoint de tip "status" care adună rapid
// câteva numere și steaguri (flags) despre contul userului — câte conturi de
// mail/emailuri/scanări are, dacă are un cont Gmail conectat și activ, dacă
// AI-ul semantic (Ollama) e activat global prin variabila de mediu
// AI_SEMANTIC_ENABLED și dacă userul l-a activat și el din setările lui
// (settings.aiEnabled). Util pentru frontend ca să decidă ce să arate (ex.
// "conectează-ți Gmail" dacă hasGmailConnected e false).
//
// Detalii: docs/EXPLICATIE_BACKEND.md §1-2 (variabile de mediu, modele, "me").
// ─────────────────────────────────────────────────────────────────────────────

import { isAiSemanticGloballyEnabled } from '../config/env.js';
import Email from '../models/email.model.js';
import MailAccount from '../models/mail-account.model.js';
import Scan from '../models/scan.model.js';
import User from '../models/user.model.js';

// Calculează statusul pentru userul dat: numere (counts) + steaguri (flags).
export const getStatusForUser = async (userId) => {
    // Promise.all rulează toate aceste interogări în paralel (mai rapid decât
    // pe rând), pentru că nu depind una de alta.
    const [mailAccountsCount, emailsCount, scansCount, activeGmailAccount, user] = await Promise.all([
        MailAccount.countDocuments({ userId }),
        Email.countDocuments({ userId }),
        Scan.countDocuments({ userId }),
        // .exists() returnează doar dacă există cel puțin un document care se
        // potrivește (mai eficient decât a citi documentul întreg).
        MailAccount.exists({ userId, provider: 'gmail', status: 'active' }),
        User.findById(userId).select('settings.aiEnabled'),
    ]);

    return {
        status: 'ok',
        scope: 'user',
        counts: {
            mailAccountsCount,
            emailsCount,
            scansCount,
        },
        flags: {
            hasGmailConnected: Boolean(activeGmailAccount),
            aiSemanticEnabled: isAiSemanticGloballyEnabled(),
            aiEnabled: Boolean(user?.settings?.aiEnabled),
        },
        generatedAt: new Date().toISOString(),
    };
};
