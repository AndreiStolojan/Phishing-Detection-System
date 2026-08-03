import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CURRENT_SCAN_ENGINE_VERSION,
    buildAuthResultsFingerprint,
    isCurrentScanValidForCurrentAiSetting,
} from '../../src/services/scan.service.js';

const passedAuth = {
    status: 'ok',
    spf: { result: 'pass', domain: 'mail.example.com' },
    dkim: { result: 'none', signatures: [] },
    dmarc: { result: 'pass', policy: 'reject', alignment: 'relaxed' },
    arc: { result: 'none', chainLength: 0 },
};

test('auth fingerprints ignore timestamps but change with scoring evidence', () => {
    const first = buildAuthResultsFingerprint({
        ...passedAuth,
        evaluatedAt: new Date('2026-07-31T10:00:00Z'),
    });
    const sameEvidence = buildAuthResultsFingerprint({
        ...passedAuth,
        evaluatedAt: new Date('2026-07-31T11:00:00Z'),
    });
    const unavailable = buildAuthResultsFingerprint({
        ...passedAuth,
        status: 'unavailable',
    });

    assert.equal(first, sameEvidence);
    assert.notEqual(first, unavailable);
});

test('a current scan is stale whenever the persisted authentication outcome changes', () => {
    const oldFingerprint = buildAuthResultsFingerprint({ status: 'unavailable' });
    const newFingerprint = buildAuthResultsFingerprint(passedAuth);
    const currentScan = {
        engineVersion: CURRENT_SCAN_ENGINE_VERSION,
        authResultsFingerprint: oldFingerprint,
    };

    assert.equal(
        isCurrentScanValidForCurrentAiSetting({
            currentScan,
            aiEnabled: false,
            authResultsFingerprint: oldFingerprint,
        }),
        true
    );
    assert.equal(
        isCurrentScanValidForCurrentAiSetting({
            currentScan,
            aiEnabled: false,
            authResultsFingerprint: newFingerprint,
        }),
        false
    );
});
