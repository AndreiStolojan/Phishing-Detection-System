import test from 'node:test';
import assert from 'node:assert/strict';

import {
    AI_SCORE_MAX,
    AI_SIGNAL_WEIGHTS,
    RISK_THRESHOLDS,
    RULE_WEIGHTS,
    SCORE_MAX,
} from '../../src/config/scoring.config.js';
import { mapScoreToVerdict } from '../../src/services/scan.service.js';

const WEAK_RULES = [
    'too_many_links_high',
    'too_many_links_medium',
    'archive_attachment_extension',
    'very_long_url',
    'shortened_url_detected',
];

test('Invariant 1: no single signal reaches the high-risk threshold alone', () => {
    const maxSingleRule = Math.max(...Object.values(RULE_WEIGHTS));
    const maxSingleAi = Math.max(...Object.values(AI_SIGNAL_WEIGHTS));

    assert.ok(maxSingleRule < RISK_THRESHOLDS.likelyPhishing);
    assert.ok(maxSingleAi < RISK_THRESHOLDS.likelyPhishing);
});

test('Invariant 2: no single weak signal exceeds the medium band alone', () => {
    for (const rule of WEAK_RULES) {
        assert.ok(
            RULE_WEIGHTS[rule] < RISK_THRESHOLDS.suspicious,
            `${rule} (${RULE_WEIGHTS[rule]}) must stay below the suspicious threshold`
        );
    }
});

test('Invariant 3: AI alone cannot declare phishing (cap below high threshold)', () => {
    assert.ok(AI_SCORE_MAX < RISK_THRESHOLDS.likelyPhishing);
    // The raw AI sum exceeds the cap, proving the cap actually constrains it.
    const rawAiSum = Object.values(AI_SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(rawAiSum > AI_SCORE_MAX);
});

test('mapScoreToVerdict reads thresholds from the central config', () => {
    assert.equal(mapScoreToVerdict(RISK_THRESHOLDS.suspicious - 1), 'safe');
    assert.equal(mapScoreToVerdict(RISK_THRESHOLDS.suspicious), 'suspicious');
    assert.equal(mapScoreToVerdict(RISK_THRESHOLDS.likelyPhishing - 1), 'suspicious');
    assert.equal(mapScoreToVerdict(RISK_THRESHOLDS.likelyPhishing), 'likely_phishing');
    assert.equal(SCORE_MAX, 100);
});
