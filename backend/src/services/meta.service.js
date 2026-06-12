import { AI_SEMANTIC_ENABLED } from '../config/env.js';
import Email from '../models/email.model.js';
import MailAccount from '../models/mail-account.model.js';
import Scan from '../models/scan.model.js';
import User from '../models/user.model.js';

const isTruthyEnvValue = (value) =>
    typeof value === 'string' && ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());

export const getStatusForUser = async (userId) => {
    const [mailAccountsCount, emailsCount, scansCount, activeGmailAccount, user] = await Promise.all([
        MailAccount.countDocuments({ userId }),
        Email.countDocuments({ userId }),
        Scan.countDocuments({ userId }),
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
            aiSemanticEnabled: isTruthyEnvValue(AI_SEMANTIC_ENABLED),
            aiEnabled: Boolean(user?.settings?.aiEnabled),
        },
        generatedAt: new Date().toISOString(),
    };
};
