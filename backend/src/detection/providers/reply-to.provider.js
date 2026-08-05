// Reply-To evidence is isolated from sender-list decisions so each provider has
// one source of facts and one stable provider id.

export const meta = Object.freeze({
    id: 'reply-to',
    version: 1,
    kind: 'rule',
    optional: false,
});

export const collectReplyToSignals = (ctx = {}) => {
    const email = ctx.email || {};

    if (
        !email.replyToDomain ||
        !email.senderDomain ||
        email.replyToDomain === email.senderDomain
    ) {
        return [];
    }

    return [
        {
            key: 'reply_to_mismatch',
            rule: 'reply_to_mismatch',
            reason: 'Reply-To domain differs from sender domain.',
            details: `Reply-To domain (${email.replyToDomain}) differs from sender domain (${email.senderDomain}).`,
            order: 20,
        },
    ];
};

export const collectSignals = collectReplyToSignals;

export const analyze = async (ctx) => ({
    signals: collectReplyToSignals(ctx),
});
