import assert from 'node:assert/strict';
import test from 'node:test';

import {
    THREAT_INTEL_ENABLED,
    THREAT_INTEL_MAX_URLS_PER_EMAIL,
    THREAT_INTEL_TIMEOUT_MS,
    URLHAUS_AUTH_KEY,
    WEB_RISK_API_KEY,
    isThreatIntelEnabled,
    isTruthyEnvValue,
} from '../../src/config/env.js';

test('isTruthyEnvValue accepts only explicit truthy values', () => {
    for (const value of ['true', 'TRUE', '1', 'yes', 'on', ' on ']) {
        assert.equal(isTruthyEnvValue(value), true);
    }

    for (const value of [undefined, null, '', 'false', '0', 'off', 'random']) {
        assert.equal(isTruthyEnvValue(value), false);
    }
});

test('threat intelligence is disabled by default and its source keys stay optional', () => {
    assert.equal(THREAT_INTEL_ENABLED, 'false');
    assert.equal(isThreatIntelEnabled(), false);
    assert.equal(WEB_RISK_API_KEY, '');
    assert.equal(URLHAUS_AUTH_KEY, '');
    assert.equal(THREAT_INTEL_MAX_URLS_PER_EMAIL, '20');
    assert.equal(THREAT_INTEL_TIMEOUT_MS, '10000');
});
