import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveEmailReviewState } from '../../src/services/email-state.service.js';

test('deriveEmailReviewState returns safe bucket for algorithmic safe email', () => {
    const state = deriveEmailReviewState({
        email: {},
        latestScan: { verdict: 'safe' },
    });

    assert.deepEqual(state, {
        reviewStatus: 'no_review_needed',
        effectiveVerdict: 'safe',
        verdictSource: 'scan',
        isQuarantined: false,
        riskBucket: 'safe',
    });
});

test('deriveEmailReviewState returns needs_review for suspicious scan', () => {
    const state = deriveEmailReviewState({
        email: {},
        latestScan: { verdict: 'suspicious' },
    });

    assert.equal(state.reviewStatus, 'pending_review');
    assert.equal(state.effectiveVerdict, 'suspicious');
    assert.equal(state.riskBucket, 'needs_review');
    assert.equal(state.isQuarantined, false);
});

test('deriveEmailReviewState returns quarantine for likely phishing scan', () => {
    const state = deriveEmailReviewState({
        email: {},
        latestScan: { verdict: 'likely_phishing' },
    });

    assert.equal(state.reviewStatus, 'pending_review');
    assert.equal(state.effectiveVerdict, 'likely_phishing');
    assert.equal(state.riskBucket, 'quarantine');
    assert.equal(state.isQuarantined, true);
});

test('deriveEmailReviewState lets user phishing verdict override scan verdict', () => {
    const state = deriveEmailReviewState({
        email: { userVerdict: 'phishing' },
        latestScan: { verdict: 'safe' },
    });

    assert.equal(state.reviewStatus, 'reviewed');
    assert.equal(state.effectiveVerdict, 'phishing');
    assert.equal(state.verdictSource, 'user');
    assert.equal(state.riskBucket, 'confirmed_phishing');
    assert.equal(state.isQuarantined, false);
});

test('deriveEmailReviewState lets user safe verdict override risky scan verdict', () => {
    const state = deriveEmailReviewState({
        email: { userVerdict: 'safe' },
        latestScan: { verdict: 'likely_phishing' },
    });

    assert.equal(state.reviewStatus, 'reviewed');
    assert.equal(state.effectiveVerdict, 'safe');
    assert.equal(state.verdictSource, 'user');
    assert.equal(state.riskBucket, 'reviewed_safe');
    assert.equal(state.isQuarantined, false);
});
