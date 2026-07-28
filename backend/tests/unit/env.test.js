import assert from 'node:assert/strict';
import test from 'node:test';

import { isTruthyEnvValue } from '../../src/config/env.js';

test('isTruthyEnvValue accepts only explicit truthy values', () => {
    for (const value of ['true', 'TRUE', '1', 'yes', 'on', ' on ']) {
        assert.equal(isTruthyEnvValue(value), true);
    }

    for (const value of [undefined, null, '', 'false', '0', 'off', 'random']) {
        assert.equal(isTruthyEnvValue(value), false);
    }
});
