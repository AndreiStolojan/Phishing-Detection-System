import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildControlledExplanation,
    buildControlledExplanationObject,
} from '../../src/services/scan-explanation.service.js';

// Characterization tests: they lock the exact user-facing explanation strings so
// that readability refactors (e.g. turning the rule lookup into a table) cannot
// silently change what the user reads. If a string genuinely needs to change,
// update the expectation here on purpose.

const SAFE_SENTENCE =
    'The current verdict shows a low risk based on the active checks. Still, verify the sender before sending any sensitive information.';
const SUSPICIOUS_SENTENCE =
    'The current verdict shows a suspicious email based on the detected signals. Avoid the links and verify the sender through a trusted channel.';
const LIKELY_PHISHING_SENTENCE =
    'The current verdict shows a high likelihood of phishing based on the detected signals. Do not open the links and do not send any sensitive information.';

test('verdict sentence is chosen by verdict, with safe as the fallback', () => {
    assert.equal(buildControlledExplanation({ verdict: 'safe' }), SAFE_SENTENCE);
    assert.equal(
        buildControlledExplanation({ verdict: 'suspicious' }),
        SUSPICIOUS_SENTENCE
    );
    assert.equal(
        buildControlledExplanation({ verdict: 'likely_phishing' }),
        LIKELY_PHISHING_SENTENCE
    );
    // Unknown / missing verdict falls back to the safe sentence.
    assert.equal(buildControlledExplanation({ verdict: 'bogus' }), SAFE_SENTENCE);
    assert.equal(buildControlledExplanation({}), SAFE_SENTENCE);
});

test('each triggered rule maps to its exact phrase', () => {
    const cases = [
        ['reply_to_mismatch', 'the Reply-To address does not match the sender'],
        ['shortened_url_detected', 'the email contains shortened links'],
        ['high_risk_attachment_extension', 'the email contains a high-risk attachment'],
        [
            'archive_attachment_extension',
            'the email contains a compressed archive attachment',
        ],
        ['suspicious_link_pattern:ip_address_link', 'the email contains suspicious link patterns'],
        ['too_many_links_high', 'the email has an unusually high number of links'],
        ['too_many_links_medium', 'the email has an unusually high number of links'],
        [
            'threat_intelligence:url_known_malicious',
            'Google Web Risk or URLhaus identified a known malicious link',
        ],
        [
            'threat_intelligence:url_known_phishing_campaign',
            'Google Web Risk identified a known phishing link',
        ],
    ];

    for (const [rule, phrase] of cases) {
        const output = buildControlledExplanation({
            verdict: 'safe',
            triggeredRules: [{ rule }],
        });
        assert.equal(
            output,
            `${SAFE_SENTENCE} The security checks flagged that ${phrase}.`,
            `rule ${rule} should produce phrase "${phrase}"`
        );
    }
});

test('unknown rules contribute no phrase and produce no rule sentence', () => {
    const output = buildControlledExplanation({
        verdict: 'safe',
        triggeredRules: [{ rule: 'totally_unknown_rule' }],
    });
    assert.equal(output, SAFE_SENTENCE);
});

test('two rules are joined, and the rule sentence is capped at two phrases', () => {
    const two = buildControlledExplanation({
        verdict: 'safe',
        triggeredRules: [
            { rule: 'reply_to_mismatch' },
            { rule: 'shortened_url_detected' },
        ],
    });
    assert.equal(
        two,
        `${SAFE_SENTENCE} The security checks flagged that the Reply-To address does not match the sender and the email contains shortened links.`
    );

    // A third rule must not leak into the sentence (slice(0, 2)).
    const three = buildControlledExplanation({
        verdict: 'safe',
        triggeredRules: [
            { rule: 'reply_to_mismatch' },
            { rule: 'shortened_url_detected' },
            { rule: 'high_risk_attachment_extension' },
        ],
    });
    assert.equal(three, two);
    assert.ok(!three.includes('high-risk attachment'));
});

test('sender-list block and allow produce their exact sentences', () => {
    const blocked = buildControlledExplanation({
        verdict: 'likely_phishing',
        senderListMatch: { listType: 'block', kind: 'domain', value: 'evil.com' },
    });
    assert.ok(
        blocked.includes(
            'You blocked this domain (evil.com), so the email is always treated as likely phishing.'
        )
    );

    const trusted = buildControlledExplanation({
        verdict: 'safe',
        senderListMatch: { listType: 'allow', kind: 'sender', value: 'boss@corp.com' },
    });
    assert.ok(
        trusted.includes(
            'This sender (boss@corp.com) is on your trusted list, so contextual signals were weighted down; critical signals like requests for passwords or dangerous attachments still count in full.'
        )
    );
});

test('verified-brand sentence includes the brand name when present', () => {
    const withName = buildControlledExplanation({
        verdict: 'safe',
        senderVerifiedBrand: true,
        verifiedBrandName: 'PayPal',
    });
    assert.ok(
        withName.includes(
            'This email comes from a verified official domain of PayPal, so brand-typical signals (urgency, links, sign-in prompts) were weighted down.'
        )
    );

    const withoutName = buildControlledExplanation({
        verdict: 'safe',
        senderVerifiedBrand: true,
    });
    assert.ok(
        withoutName.includes(
            'This email comes from a verified official domain, so brand-typical signals (urgency, links, sign-in prompts) were weighted down.'
        )
    );
});

test('AI sentence only appears when the AI evaluated the email', () => {
    const notEvaluated = buildControlledExplanation({
        verdict: 'safe',
        aiSignals: { status: 'failed' },
    });
    assert.equal(notEvaluated, SAFE_SENTENCE);

    const evaluatedNoSignals = buildControlledExplanation({
        verdict: 'safe',
        aiSignals: { status: 'evaluated' },
    });
    assert.ok(
        evaluatedNoSignals.endsWith('The AI analysis did not add any strong risk signals.')
    );

    const evaluatedWithSignals = buildControlledExplanation({
        verdict: 'suspicious',
        aiSignals: {
            status: 'evaluated',
            urgencyLevel: 'high',
            sensitiveDataRequest: true,
            brandImpersonationSuspected: true,
        },
    });
    // Capped at the first two fragments, in declaration order.
    assert.ok(
        evaluatedWithSignals.endsWith(
            'The AI analysis indicates that the text uses pressure or urgency and the message asks for sensitive information.'
        )
    );
});

test('full assembly orders the sentences verdict -> senderList -> brand -> rules -> ai', () => {
    const output = buildControlledExplanation({
        verdict: 'suspicious',
        senderListMatch: { listType: 'allow', kind: 'domain', value: 'corp.com' },
        senderVerifiedBrand: true,
        verifiedBrandName: 'Corp',
        triggeredRules: [{ rule: 'reply_to_mismatch' }],
        aiSignals: { status: 'evaluated', urgencyLevel: 'medium' },
    });

    const verdictIdx = output.indexOf('suspicious email');
    const listIdx = output.indexOf('trusted list');
    const brandIdx = output.indexOf('verified official domain');
    const ruleIdx = output.indexOf('security checks flagged');
    const aiIdx = output.indexOf('AI analysis indicates');

    assert.ok(verdictIdx < listIdx);
    assert.ok(listIdx < brandIdx);
    assert.ok(brandIdx < ruleIdx);
    assert.ok(ruleIdx < aiIdx);
});

test('buildControlledExplanationObject wraps the same string under summary', () => {
    const input = {
        verdict: 'likely_phishing',
        triggeredRules: [{ rule: 'shortened_url_detected' }],
    };
    assert.deepEqual(buildControlledExplanationObject(input), {
        summary: buildControlledExplanation(input),
    });
});
