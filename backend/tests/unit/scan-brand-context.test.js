import test from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateRulesForEmail,
    calculateAiScoreFromSignals,
} from '../../src/services/scan.service.js';

/*
 * Integration-level checks: prove the verified-brand context modifier is actually
 * applied end-to-end inside the two scoring functions (not just in the standalone
 * helper), and that the triggered-rule points always sum back to the sub-score.
 */

// reply_to_mismatch (18) + too_many_links_medium (10)
const email = {
    senderDomain: 'paypal.com',
    replyToDomain: 'support.example.com',
    hasShortenedUrl: false,
    suspiciousLinkPatterns: [],
    attachmentExtensions: [],
    linkCount: 7,
};

// urgency_high (8) + login_or_action (8) + sensitive_data (20) + brand_impersonation (10)
const aiSignals = {
    status: 'evaluated',
    urgencyLevel: 'high',
    loginOrActionRequest: true,
    sensitiveDataRequest: true,
    brandImpersonationSuspected: true,
    socialEngineeringLevel: 'none',
};

const sumPoints = (rules) => rules.reduce((total, r) => total + r.points, 0);
const ruleIds = (rules) => rules.map((r) => r.rule);

test('rules: unverified sender keeps full weights', () => {
    const result = calculateRulesForEmail(email, { senderVerifiedBrand: false });
    assert.equal(result.ruleScore, 28); // 18 + 10
    assert.equal(sumPoints(result.triggeredRules), result.ruleScore);
});

test('rules: verified brand discounts reply-to and link-count signals', () => {
    const result = calculateRulesForEmail(email, { senderVerifiedBrand: true });
    assert.equal(result.ruleScore, 13); // round(18*0.5)=9 + round(10*0.4)=4
    assert.equal(sumPoints(result.triggeredRules), result.ruleScore);
});

test('AI: unverified sender keeps full weights including brand impersonation', () => {
    const result = calculateAiScoreFromSignals(aiSignals, { senderVerifiedBrand: false });
    assert.equal(result.aiScore, 46); // 8 + 8 + 20 + 10
    assert.ok(ruleIds(result.aiTriggeredRules).includes('ai_semantic:brand_impersonation_suspected'));
    assert.equal(sumPoints(result.aiTriggeredRules), result.aiScore);
});

test('AI: verified brand suppresses impersonation, discounts urgency/CTA, keeps sensitive-data full', () => {
    const result = calculateAiScoreFromSignals(aiSignals, { senderVerifiedBrand: true });
    // round(8*0.5)=4 urgency + round(8*0.3)=2 CTA + 20 sensitive (unchanged) + 0 impersonation
    assert.equal(result.aiScore, 26);
    assert.ok(
        !ruleIds(result.aiTriggeredRules).includes('ai_semantic:brand_impersonation_suspected'),
        'brand impersonation must be fully dropped, not shown with +0'
    );
    // sensitive_data_request must NOT be discounted for verified brands.
    const sensitive = result.aiTriggeredRules.find(
        (r) => r.rule === 'ai_semantic:sensitive_data_request'
    );
    assert.equal(sensitive.points, 20);
    assert.equal(sumPoints(result.aiTriggeredRules), result.aiScore);
});

test('verified brand never increases the score versus unverified (modifier is a discount)', () => {
    const unverifiedRule = calculateRulesForEmail(email, { senderVerifiedBrand: false });
    const verifiedRule = calculateRulesForEmail(email, { senderVerifiedBrand: true });
    const unverifiedAi = calculateAiScoreFromSignals(aiSignals, { senderVerifiedBrand: false });
    const verifiedAi = calculateAiScoreFromSignals(aiSignals, { senderVerifiedBrand: true });

    assert.ok(verifiedRule.ruleScore <= unverifiedRule.ruleScore);
    assert.ok(verifiedAi.aiScore <= unverifiedAi.aiScore);
});
