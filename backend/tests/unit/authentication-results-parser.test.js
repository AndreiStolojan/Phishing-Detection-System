// ─────────────────────────────────────────────────────────────────────────────
// authentication-results-parser.test.js — limita de încredere Gmail și cazuri
// reale reprezentative pentru antetul RFC 8601 Authentication-Results.
// ─────────────────────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseAuthenticationResults } from '../../src/services/email-auth/authentication-results.parser.js';

const fixtureUrl = new URL('../fixtures/email-auth/authentication-results.json', import.meta.url);
const cases = JSON.parse(readFileSync(fixtureUrl, 'utf8'));
const emptyResult = {
    authservId: null,
    spf: null,
    dkim: null,
    dmarc: null,
    compauth: null,
};

for (const fixture of cases) {
    test(`Authentication-Results: ${fixture.name}`, () => {
        const rawHeaders = fixture.values.map((value) => ({
            name: 'Authentication-Results',
            value,
        }));

        const expected = {
            ...emptyResult,
            ...fixture.expected,
        };

        assert.deepEqual(parseAuthenticationResults(rawHeaders), expected);
    });
}

test('unrelated raw headers and malformed inputs produce an empty result', () => {
    assert.deepEqual(parseAuthenticationResults([
        { name: 'From', value: 'sender@example.com' },
        { name: 'Received-SPF', value: 'pass' },
        { name: 42, value: 'mx.google.com; spf=pass smtp.mailfrom=example.com' },
    ]), emptyResult);
    assert.deepEqual(parseAuthenticationResults(null), emptyResult);
    assert.deepEqual(parseAuthenticationResults('not a raw-header collection'), emptyResult);
});

test('Mixed-field object representation is accepted without weakening trust selection', () => {
    assert.deepEqual(parseAuthenticationResults({
        'Authentication-Results': [
            'upstream.example; spf=pass smtp.mailfrom=attacker.example',
            'mx.google.com; spf=fail smtp.mailfrom=attacker.example',
        ],
    }), {
        ...emptyResult,
        authservId: 'mx.google.com',
        spf: { result: 'fail', domain: 'attacker.example' },
    });
});

test('the fixture matrix retains at least the task-required 15 representative headers', () => {
    assert.ok(cases.length >= 15);
});
