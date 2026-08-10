// User-maintained sender-list evidence. The blocklist is an explicit decision,
// so its special score floor remains outside the ordinary weight modules.

export const meta = Object.freeze({
    id: 'sender-list',
    version: 1,
    kind: 'rule',
    optional: false,
});

export const collectSenderListSignals = (ctx = {}) => {
    // scanContext fallback keeps the synchronous legacy facade compatible;
    // modular scans provide the dedicated senderListContext.
    const senderListContext = ctx.senderListContext || ctx.scanContext || {};

    if (!senderListContext.senderBlocklisted) {
        return [];
    }

    const match = senderListContext.listMatch || {};
    const matchLabel =
        match.kind === 'domain'
            ? `domain (${match.value})`
            : `sender (${match.value})`;

    return [
        {
            key: 'user_blocklist_match',
            rule: 'user_blocklist_match',
            reason: 'Sender is on your blocked list.',
            details: `You blocked this ${matchLabel}, so the email is always treated as likely phishing.`,
            order: 10,
        },
    ];
};

export const collectSignals = collectSenderListSignals;

export const analyze = async (ctx) => ({
    signals: collectSenderListSignals(ctx),
});
