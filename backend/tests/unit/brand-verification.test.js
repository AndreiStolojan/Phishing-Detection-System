import test from 'node:test';
import assert from 'node:assert/strict';

import { verifySenderBrand } from '../../src/services/brand-verification.service.js';
import {
    AI_SIGNAL_WEIGHTS,
    RULE_WEIGHTS,
    VERIFIED_BRAND_MODIFIERS,
    applyVerifiedBrandModifier,
} from '../../src/config/scoring.config.js';

// ── verifySenderBrand ──────────────────────────────────────────────────────────

test('verifies an exact official brand domain', () => {
    const result = verifySenderBrand({ senderDomain: 'paypal.com' });
    assert.equal(result.senderVerifiedBrand, true);
    assert.equal(result.brandName, 'PayPal');
    assert.equal(result.matchedDomain, 'paypal.com');
    assert.ok(result.officialDomains.includes('paypal.com'));
});

test('verifies a subdomain of an official brand domain (mail.paypal.com → paypal.com)', () => {
    const result = verifySenderBrand({ senderDomain: 'mail.paypal.com' });
    assert.equal(result.senderVerifiedBrand, true);
    assert.equal(result.brandName, 'PayPal');
});

test('verifies regardless of case and a leading www.', () => {
    const result = verifySenderBrand({ senderDomain: 'WWW.PayPal.com' });
    assert.equal(result.senderVerifiedBrand, true);
    assert.equal(result.senderDomain, 'paypal.com');
});

test('does NOT verify a lookalike domain (evil-paypal.com)', () => {
    const result = verifySenderBrand({ senderDomain: 'evil-paypal.com' });
    assert.equal(result.senderVerifiedBrand, false);
    assert.equal(result.brandName, null);
});

test('does NOT verify a suffix-spoof domain (paypal.com.evil.com)', () => {
    const result = verifySenderBrand({ senderDomain: 'paypal.com.evil.com' });
    assert.equal(result.senderVerifiedBrand, false);
});

test('does NOT verify consumer mailbox domains even though brands own them', () => {
    for (const domain of ['gmail.com', 'outlook.com', 'live.com', 'icloud.com', 'hotmail.com']) {
        const result = verifySenderBrand({ senderDomain: domain });
        assert.equal(
            result.senderVerifiedBrand,
            false,
            `${domain} must never be treated as a verified brand`
        );
    }
});

test('does not verify an unknown brand domain (safe fallback)', () => {
    const result = verifySenderBrand({ senderDomain: 'some-random-shop.example' });
    assert.equal(result.senderVerifiedBrand, false);
});

test('handles a missing/empty sender domain', () => {
    assert.equal(verifySenderBrand({}).senderVerifiedBrand, false);
    assert.equal(verifySenderBrand({ senderDomain: '' }).senderVerifiedBrand, false);
});

// ── applyVerifiedBrandModifier ───────────────────────────────────────────────────

test('modifier is a no-op when the sender is not a verified brand', () => {
    assert.equal(
        applyVerifiedBrandModifier('urgency_high', AI_SIGNAL_WEIGHTS.urgency_high, {
            senderVerifiedBrand: false,
        }),
        AI_SIGNAL_WEIGHTS.urgency_high
    );
});

test('verified brand suppresses brand impersonation to 0', () => {
    assert.equal(
        applyVerifiedBrandModifier(
            'brand_impersonation_suspected',
            AI_SIGNAL_WEIGHTS.brand_impersonation_suspected,
            { senderVerifiedBrand: true }
        ),
        0
    );
});

test('verified brand discounts urgency, CTA and link-count signals', () => {
    const ctx = { senderVerifiedBrand: true };
    assert.equal(applyVerifiedBrandModifier('urgency_high', 8, ctx), 4); // ×0.5
    assert.equal(applyVerifiedBrandModifier('login_or_action_request', 8, ctx), 2); // ×0.3 → 2.4 → 2
    assert.equal(applyVerifiedBrandModifier('too_many_links_high', 18, ctx), 7); // ×0.4 → 7.2 → 7
    assert.equal(applyVerifiedBrandModifier('too_many_links_medium', 10, ctx), 4); // ×0.4
    assert.equal(applyVerifiedBrandModifier('reply_to_mismatch', 18, ctx), 9); // ×0.5
});

test('verified brand keeps high-value payload signals at full weight', () => {
    const ctx = { senderVerifiedBrand: true };
    // sensitive_data_request is intentionally NOT in the modifier table.
    assert.equal(
        applyVerifiedBrandModifier(
            'sensitive_data_request',
            AI_SIGNAL_WEIGHTS.sensitive_data_request,
            ctx
        ),
        AI_SIGNAL_WEIGHTS.sensitive_data_request
    );
    assert.equal(
        applyVerifiedBrandModifier(
            'high_risk_attachment_extension',
            RULE_WEIGHTS.high_risk_attachment_extension,
            ctx
        ),
        RULE_WEIGHTS.high_risk_attachment_extension
    );
});

test('every modifier multiplier is within [0, 1] (a discount, never an amplifier)', () => {
    for (const [key, multiplier] of Object.entries(VERIFIED_BRAND_MODIFIERS)) {
        assert.ok(
            multiplier >= 0 && multiplier <= 1,
            `${key} multiplier ${multiplier} must be in [0, 1]`
        );
    }
});
