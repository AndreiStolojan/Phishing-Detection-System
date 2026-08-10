import { describe, expect, it } from 'vitest';

import { getSenderAuthentication } from '../../src/lib/senderAuth.js';

// The whole point of the three-state model is that "we could not check" must
// never be drawn as "this failed". A two-state UI turns every DNS timeout and
// every unsupported mechanism into an accusation against a legitimate sender.

const authResults = (overrides = {}) => ({
  spf: { result: 'pass' },
  dkim: { result: 'pass' },
  dmarc: { result: 'pass', policy: 'reject', alignment: 'relaxed' },
  status: 'ok',
  ...overrides,
});

const stateOf = (result, id) =>
  result.mechanisms.find((mechanism) => mechanism.id === id).state;

describe('getSenderAuthentication', () => {
  it('reports a fully authenticated sender as verified', () => {
    const result = getSenderAuthentication(authResults());

    expect(result.verified).toBe(true);
    expect(result.tone).toBe('pass');
    expect(result.mechanisms.map((m) => m.state)).toEqual(['pass', 'pass', 'pass']);
    expect(result.summary).toMatch(/really came from/i);
  });

  it('treats a missing result as unknown rather than failed', () => {
    // A DNS timeout, an unsupported mechanism or a pre-feature email all arrive
    // as absent values. None of them is evidence against the sender.
    for (const missing of [undefined, null, '', 'temperror', 'permerror']) {
      const result = getSenderAuthentication(
        authResults({ spf: { result: missing }, dmarc: { result: missing } })
      );

      expect(stateOf(result, 'spf'), `spf for ${String(missing)}`).toBe('unknown');
      expect(result.verified, `verified for ${String(missing)}`).toBe(false);
      expect(result.tone).not.toBe('fail');
    }
  });

  it('does not read "none" as a failure', () => {
    // `none` means the domain publishes no policy — a fact about the domain,
    // not a verdict on the message.
    const result = getSenderAuthentication(
      authResults({ dmarc: { result: 'none' }, dkim: { result: 'none' } })
    );

    expect(stateOf(result, 'dmarc')).toBe('unknown');
    expect(stateOf(result, 'dkim')).toBe('unknown');
    expect(result.mechanisms.find((m) => m.id === 'dmarc').description)
      .toMatch(/publishes no policy/i);
  });

  it('surfaces a genuine DMARC failure', () => {
    const result = getSenderAuthentication(
      authResults({ dmarc: { result: 'fail', policy: 'reject' } })
    );

    expect(result.tone).toBe('fail');
    expect(result.verified).toBe(false);
    expect(result.summary).toMatch(/failed/i);
  });

  it('keeps conclusive mechanisms when the overall status is unavailable', () => {
    // The backend collapses `status` to 'unavailable' if any component could not
    // run. Discarding the whole set would throw away a real SPF failure because
    // an unrelated DNS lookup timed out.
    const result = getSenderAuthentication({
      spf: { result: 'fail' },
      dkim: { result: 'temperror' },
      dmarc: { result: 'temperror' },
      status: 'unavailable',
    });

    expect(stateOf(result, 'spf')).toBe('fail');
    expect(stateOf(result, 'dkim')).toBe('unknown');
    expect(result.summary).toMatch(/only partly verify/i);
  });

  it('degrades safely when there are no auth results at all', () => {
    for (const empty of [null, undefined, 'nonsense', 42]) {
      const result = getSenderAuthentication(empty);

      expect(result.available).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.mechanisms).toEqual([]);
    }
  });

  it('gives every mechanism a human description in every state', () => {
    // Guards against a state falling through to `undefined` copy, which would
    // render an empty row that looks like a rendering bug.
    for (const value of ['pass', 'fail', 'none', undefined]) {
      const result = getSenderAuthentication(
        authResults({ spf: { result: value }, dkim: { result: value }, dmarc: { result: value } })
      );

      for (const mechanism of result.mechanisms) {
        expect(mechanism.description, `${mechanism.id} @ ${String(value)}`).toBeTruthy();
        expect(mechanism.label).toBeTruthy();
      }
    }
  });
});
