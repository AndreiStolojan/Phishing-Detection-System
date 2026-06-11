import test from 'node:test';
import assert from 'node:assert/strict';

import {
    matchSenderListEntries,
    normalizeSenderAddress,
    normalizeListDomain,
} from '../../src/services/sender-list.service.js';
import {
    RISK_THRESHOLDS,
    USER_ALLOWLIST_MODIFIERS,
    USER_BLOCKLIST_RULE_POINTS,
    applyScoreContextModifiers,
} from '../../src/config/scoring.config.js';
import {
    calculateRulesForEmail,
    calculateAiScoreFromSignals,
    mapScoreToVerdict,
} from '../../src/services/scan.service.js';

/* ── Normalization ──────────────────────────────────────────────────────────── */

test('normalizeSenderAddress extracts the address from a display-name header', () => {
    assert.equal(normalizeSenderAddress('PayPal <Service@Paypal.com>'), 'service@paypal.com');
    assert.equal(normalizeSenderAddress('  user@Example.COM  '), 'user@example.com');
    assert.equal(normalizeSenderAddress(''), '');
});

test('normalizeListDomain strips www and trailing dots and lowercases', () => {
    assert.equal(normalizeListDomain('WWW.Example.com.'), 'example.com');
});

/* ── Matching precedence ────────────────────────────────────────────────────── */

const entries = [
    { kind: 'sender', listType: 'allow', value: 'boss@company.com' },
    { kind: 'domain', listType: 'block', value: 'company.com' },
    { kind: 'domain', listType: 'allow', value: 'newsletter.example' },
];

test('exact sender entry beats a conflicting domain entry', () => {
    const context = matchSenderListEntries({
        entries,
        senderAddress: 'Boss <boss@company.com>',
        senderDomain: 'company.com',
    });

    assert.equal(context.senderAllowlisted, true);
    assert.equal(context.senderBlocklisted, false);
    assert.equal(context.listMatch.kind, 'sender');
});

test('domain entry applies when no sender entry matches, suffix-aware', () => {
    const context = matchSenderListEntries({
        entries,
        senderAddress: 'other@mail.company.com',
        senderDomain: 'mail.company.com',
    });

    assert.equal(context.senderBlocklisted, true);
    assert.equal(context.listMatch.value, 'company.com');
});

test('lookalike domains do not match a listed domain', () => {
    const context = matchSenderListEntries({
        entries,
        senderAddress: 'x@evil-company.com',
        senderDomain: 'evil-company.com',
    });

    assert.equal(context.senderAllowlisted, false);
    assert.equal(context.senderBlocklisted, false);
    assert.equal(context.listMatch, null);
});

/* ── Blocklist scoring: hard floor ──────────────────────────────────────────── */

test('blocklist points always guarantee the likely_phishing verdict', () => {
    assert.ok(USER_BLOCKLIST_RULE_POINTS >= RISK_THRESHOLDS.likelyPhishing);
});

test('a blocklisted email with zero other signals is likely_phishing', () => {
    const result = calculateRulesForEmail(
        { senderDomain: 'spam.example', linkCount: 0 },
        {
            senderBlocklisted: true,
            listMatch: { listType: 'block', kind: 'domain', value: 'spam.example' },
        }
    );

    assert.equal(mapScoreToVerdict(result.ruleScore), 'likely_phishing');
    assert.ok(result.triggeredRules.some((r) => r.rule === 'user_blocklist_match'));
});

test('real signals still add on top of the blocklist floor', () => {
    const result = calculateRulesForEmail(
        {
            senderDomain: 'spam.example',
            replyToDomain: 'other.example',
            linkCount: 0,
        },
        { senderBlocklisted: true, listMatch: { listType: 'block', kind: 'domain', value: 'spam.example' } }
    );

    assert.ok(result.ruleScore > USER_BLOCKLIST_RULE_POINTS);
});

/* ── Allowlist scoring: strong discount, critical signals intact ────────────── */

// reply_to_mismatch (18) + too_many_links_medium (10) would normally fire.
const allowlistedEmail = {
    senderDomain: 'company.com',
    replyToDomain: 'esp.example',
    linkCount: 7,
    suspiciousLinkPatterns: [],
    attachmentExtensions: [],
};

test('allowlist mutes contextual rule signals entirely', () => {
    const result = calculateRulesForEmail(allowlistedEmail, {
        senderAllowlisted: true,
        listMatch: { listType: 'allow', kind: 'domain', value: 'company.com' },
    });

    assert.equal(result.ruleScore, 0);
    assert.equal(result.triggeredRules.length, 0);
});

test('allowlist keeps payload signals at full weight (compromised-sender cover)', () => {
    const result = calculateRulesForEmail(
        {
            ...allowlistedEmail,
            suspiciousLinkPatterns: ['ip_address_link', 'punycode_domain'],
            attachmentExtensions: ['exe'],
        },
        { senderAllowlisted: true }
    );

    const ruleIds = result.triggeredRules.map((r) => r.rule);

    assert.ok(ruleIds.includes('suspicious_link_pattern:ip_address_link'));
    assert.ok(ruleIds.includes('suspicious_link_pattern:punycode_domain'));
    assert.ok(ruleIds.includes('high_risk_attachment_extension'));
    // 25 + 20 + 35 = 80 — enough to flag even a trusted sender.
    assert.equal(mapScoreToVerdict(result.ruleScore), 'likely_phishing');
});

test('allowlist keeps the sensitive-data AI signal at full weight', () => {
    const aiSignals = {
        status: 'evaluated',
        urgencyLevel: 'high',
        loginOrActionRequest: true,
        sensitiveDataRequest: true,
        brandImpersonationSuspected: true,
        socialEngineeringLevel: 'none',
    };
    const result = calculateAiScoreFromSignals(aiSignals, { senderAllowlisted: true });
    const sensitive = result.aiTriggeredRules.find(
        (r) => r.rule === 'ai_semantic:sensitive_data_request'
    );

    assert.equal(sensitive.points, 20);
    // urgency, CTA and impersonation are muted to 0 for a trusted sender.
    assert.equal(result.aiScore, 20);
});

/* ── Modifier combination ───────────────────────────────────────────────────── */

test('combined layers take the minimum multiplier and never increase points', () => {
    // verified brand: reply_to_mismatch x0.5 — allowlist: x0 — min wins.
    const both = applyScoreContextModifiers('reply_to_mismatch', 18, {
        senderVerifiedBrand: true,
        senderAllowlisted: true,
    });
    assert.equal(both, 0);

    // brand-only path unchanged from the v6 behaviour.
    const brandOnly = applyScoreContextModifiers('reply_to_mismatch', 18, {
        senderVerifiedBrand: true,
    });
    assert.equal(brandOnly, 9);

    // unknown signal keys keep full weight.
    const unknown = applyScoreContextModifiers('ip_address_link', 25, {
        senderVerifiedBrand: true,
        senderAllowlisted: true,
    });
    assert.equal(unknown, 25);
});

test('allowlist modifier table never lists the critical payload signals', () => {
    for (const criticalKey of [
        'sensitive_data_request',
        'high_risk_attachment_extension',
        'ip_address_link',
        'embedded_credentials',
        'punycode_domain',
    ]) {
        assert.ok(
            !(criticalKey in USER_ALLOWLIST_MODIFIERS),
            `${criticalKey} must keep full weight for allowlisted senders`
        );
    }
});
