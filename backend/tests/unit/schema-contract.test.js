import test from 'node:test';
import assert from 'node:assert/strict';

import Email from '../../src/models/email.model.js';
import Scan from '../../src/models/scan.model.js';
import { CURRENT_SCAN_ENGINE_VERSION, mapScoreToVerdict } from '../../src/services/scan.service.js';

test('mapScoreToVerdict keeps MVP score thresholds stable', () => {
    assert.equal(mapScoreToVerdict(0), 'safe');
    assert.equal(mapScoreToVerdict(29), 'safe');
    assert.equal(mapScoreToVerdict(30), 'suspicious');
    assert.equal(mapScoreToVerdict(59), 'suspicious');
    assert.equal(mapScoreToVerdict(60), 'likely_phishing');
});

test('Scan schema persists engineVersion for current-scan validation', () => {
    const scan = new Scan({
        emailId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        score: 60,
        ruleScore: 60,
        aiScore: 0,
        verdict: 'likely_phishing',
        engineVersion: CURRENT_SCAN_ENGINE_VERSION,
    });

    assert.equal(Scan.schema.path('engineVersion').instance, 'String');
    assert.equal(Scan.schema.path('authResultsFingerprint').instance, 'String');
    assert.equal(scan.engineVersion, CURRENT_SCAN_ENGINE_VERSION);
});

test('Email schema keeps raw body fields separate from detail contract fields', () => {
    assert.equal(Email.schema.path('textBody').instance, 'String');
    assert.equal(Email.schema.path('htmlBody').instance, 'String');
    assert.equal(Email.schema.path('syncSource').instance, 'String');
    assert.ok(Email.schema.path('authResults'));
    assert.equal(Email.schema.path('authResults.status').instance, 'String');
    assert.deepEqual(
        Email.schema.path('authResults.status').options.enum,
        ['ok', 'partial', 'unavailable']
    );
});
