// Transformă rezultatele autentificării persistate pe email în semnale fără
// puncte. Verificarea criptografică și DNS rulează înaintea scanării.

export const meta = Object.freeze({
    id: 'email-auth',
    version: 1,
    kind: 'rule',
    optional: true,
});

const isNone = (value) => !value || value === 'none';

export const collectEmailAuthSignals = (ctx = {}) => {
    const authResults = ctx.authResults || ctx.email?.authResults;

    if (!authResults || authResults.status !== 'ok') {
        return [];
    }

    const signals = [];
    const arcPassed = authResults.arc?.result === 'pass';
    const dmarc = authResults.dmarc || {};

    if (dmarc.result === 'fail') {
        const policy = ['reject', 'quarantine'].includes(dmarc.policy)
            ? dmarc.policy
            : 'none';
        const policyLabels = {
            reject: 'requires rejecting unauthenticated mail',
            quarantine: 'asks receivers to quarantine unauthenticated mail',
            none: 'publishes monitoring-only authentication policy',
        };

        signals.push({
            key: `dmarc_fail_policy_${policy}`,
            rule: `email_auth:dmarc_fail_policy_${policy}`,
            reason: `DMARC authentication failed under the sender domain's ${policy} policy.`,
            details: `The sender domain ${policyLabels[policy]}, and this message did not provide aligned SPF or DKIM authentication.`,
            order: 12,
        });
    }

    if (!arcPassed && authResults.spf?.result === 'fail') {
        signals.push({
            key: 'spf_hardfail',
            rule: 'email_auth:spf_hardfail',
            reason: 'Gmail reports that the sending server failed SPF authorization.',
            details: 'The trusted Gmail Authentication-Results header records an SPF hard failure.',
            order: 13,
        });
    }

    if (!arcPassed && authResults.dkim?.result === 'fail') {
        signals.push({
            key: 'dkim_invalid_signature',
            rule: 'email_auth:dkim_invalid_signature',
            reason: 'The email contains an invalid DKIM signature.',
            details: 'Local cryptographic verification found a DKIM signature whose signed content does not verify.',
            order: 14,
        });
    }

    if (
        isNone(authResults.spf?.result) &&
        isNone(authResults.dkim?.result) &&
        isNone(authResults.dmarc?.result)
    ) {
        signals.push({
            key: 'no_authentication_at_all',
            rule: 'email_auth:no_authentication_at_all',
            reason: 'The message has no usable SPF, DKIM, or DMARC authentication.',
            details: 'No sender-authentication mechanism produced evidence for this message.',
            order: 15,
        });
    }

    if (
        ctx.brandContext?.brandState === 'claimed_unauthenticated' &&
        ctx.brandContext.authenticationStatus === 'fail'
    ) {
        signals.push({
            key: 'claimed_brand_authentication_failed',
            rule: 'email_auth:claimed_brand_authentication_failed',
            reason: `${ctx.brandContext.brandName || 'A known brand'} is claimed by the sender domain, but authentication did not verify that claim.`,
            details: 'Brand score reductions were withheld because aligned DMARC authentication did not pass.',
            order: 16,
        });
    }

    return signals;
};

export const collectSignals = collectEmailAuthSignals;

export const analyze = async (ctx) => {
    const authResults = ctx.authResults || ctx.email?.authResults;

    if (!authResults || authResults.status !== 'ok') {
        return { signals: [], status: 'skipped', meta: { reason: 'authentication_unavailable' } };
    }

    return { signals: collectEmailAuthSignals(ctx) };
};
