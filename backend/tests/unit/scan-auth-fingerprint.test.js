import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CURRENT_SCAN_ENGINE_VERSION,
    CURRENT_THREAT_INTEL_CONFIG_FINGERPRINT,
    buildAuthResultsFingerprint,
    buildThreatIntelConfigFingerprint,
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
        threatIntelConfigFingerprint: CURRENT_THREAT_INTEL_CONFIG_FINGERPRINT,
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

test('enabling or configuring threat intelligence makes an earlier scan stale', () => {
    const disabled = buildThreatIntelConfigFingerprint({
        enabled: false,
        webRiskConfigured: false,
        urlhausConfigured: false,
        maxUrls: 5,
    });
    const enabled = buildThreatIntelConfigFingerprint({
        enabled: true,
        webRiskConfigured: true,
        urlhausConfigured: false,
        maxUrls: 5,
    });
    const authResultsFingerprint = buildAuthResultsFingerprint(passedAuth);
    const currentScan = {
        engineVersion: CURRENT_SCAN_ENGINE_VERSION,
        authResultsFingerprint,
        threatIntelConfigFingerprint: disabled,
    };

    assert.equal(isCurrentScanValidForCurrentAiSetting({
        currentScan,
        aiEnabled: false,
        authResultsFingerprint,
        threatIntelConfigFingerprint: disabled,
    }), true);
    assert.equal(isCurrentScanValidForCurrentAiSetting({
        currentScan,
        aiEnabled: false,
        authResultsFingerprint,
        threatIntelConfigFingerprint: enabled,
    }), false);
    assert.doesNotMatch(enabled, /true|false|web|urlhaus/i);
});

test('an enabled threat intelligence outage is retried on a later sync', () => {
    const authResultsFingerprint = buildAuthResultsFingerprint(passedAuth);
    const currentScan = {
        engineVersion: CURRENT_SCAN_ENGINE_VERSION,
        authResultsFingerprint,
        threatIntelConfigFingerprint: CURRENT_THREAT_INTEL_CONFIG_FINGERPRINT,
        providerMeta: [{
            provider: 'threat-intelligence',
            status: 'skipped',
            meta: {
                sourceStatuses: {
                    web_risk: 'unavailable',
                    urlhaus: 'unavailable',
                    rdap: 'unavailable',
                    redirect: 'skipped',
                },
            },
        }],
    };

    assert.equal(isCurrentScanValidForCurrentAiSetting({
        currentScan,
        aiEnabled: false,
        authResultsFingerprint,
        threatIntelEnabled: false,
    }), true);
    assert.equal(isCurrentScanValidForCurrentAiSetting({
        currentScan,
        aiEnabled: false,
        authResultsFingerprint,
        threatIntelEnabled: true,
    }), false);

    currentScan.providerMeta[0].status = 'success';
    assert.equal(isCurrentScanValidForCurrentAiSetting({
        currentScan,
        aiEnabled: false,
        authResultsFingerprint,
        threatIntelEnabled: true,
    }), true);
});
