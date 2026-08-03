import assert from 'node:assert/strict';
import test from 'node:test';

import { collectEmailAuthSignals } from '../../src/detection/providers/email-auth.provider.js';
import { scoreSignals } from '../../src/detection/scorer.js';
import { verifySenderBrand } from '../../src/services/brand-verification.service.js';

const withKind = (signals) => signals.map((signal) => ({ ...signal, kind: 'rule' }));

test('DMARC policy, SPF, DKIM and claimed-brand evidence stays point-free', () => {
    const authResults = {
        status: 'ok',
        spf: { result: 'fail' },
        dkim: { result: 'fail' },
        dmarc: { result: 'fail', policy: 'reject' },
        arc: { result: 'none' },
    };
    const brandContext = verifySenderBrand({ senderDomain: 'paypal.com', authResults });
    const signals = collectEmailAuthSignals({ authResults, brandContext });

    assert.deepEqual(signals.map(({ key }) => key), [
        'dmarc_fail_policy_reject',
        'spf_hardfail',
        'dkim_invalid_signature',
        'claimed_brand_authentication_failed',
    ]);
    assert.ok(signals.every((signal) => !Object.hasOwn(signal, 'points')));
});

test('valid ARC suppresses SPF and DKIM failures but not DMARC policy failure', () => {
    const signals = collectEmailAuthSignals({
        authResults: {
            status: 'ok',
            spf: { result: 'fail' },
            dkim: { result: 'fail' },
            dmarc: { result: 'fail', policy: 'quarantine' },
            arc: { result: 'pass', chainLength: 2 },
        },
        brandContext: { brandState: 'unknown' },
    });

    assert.deepEqual(signals.map(({ key }) => key), ['dmarc_fail_policy_quarantine']);
});

test('successful evaluation with no authentication emits one bounded signal', () => {
    const signals = collectEmailAuthSignals({
        authResults: {
            status: 'ok',
            spf: { result: 'none' },
            dkim: { result: 'none' },
            dmarc: { result: 'none' },
            arc: { result: 'none' },
        },
    });

    assert.deepEqual(signals.map(({ key }) => key), ['no_authentication_at_all']);
});

test('unavailable authentication produces zero signals and no brand discount', () => {
    const authResults = { status: 'unavailable', failureReason: 'dns_timeout' };
    const brandContext = verifySenderBrand({ senderDomain: 'paypal.com', authResults });

    assert.deepEqual(collectEmailAuthSignals({ authResults, brandContext }), []);
    assert.equal(brandContext.senderVerifiedBrand, false);
    assert.equal(brandContext.authenticationStatus, 'unavailable');
});

test('failed authentication on a claimed brand scores above an equivalent unknown sender', () => {
    const authResults = {
        status: 'ok',
        spf: { result: 'neutral' },
        dkim: { result: 'none' },
        dmarc: { result: 'fail', policy: 'none' },
        arc: { result: 'none' },
    };
    const claimedBrand = verifySenderBrand({ senderDomain: 'paypal.com', authResults });
    const unknownBrand = verifySenderBrand({ senderDomain: 'unknown.example', authResults });
    const claimedScore = scoreSignals(
        withKind(collectEmailAuthSignals({ authResults, brandContext: claimedBrand })),
        claimedBrand
    );
    const unknownScore = scoreSignals(
        withKind(collectEmailAuthSignals({ authResults, brandContext: unknownBrand })),
        unknownBrand
    );

    assert.ok(claimedScore.score > unknownScore.score);
    assert.equal(claimedScore.score, 40);
    assert.equal(unknownScore.score, 15);
});
