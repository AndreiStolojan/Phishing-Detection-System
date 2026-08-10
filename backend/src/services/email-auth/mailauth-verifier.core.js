// ───────────────────────────────────────────────────────────────────────────────
// Local DKIM and ARC verification over the exact RFC 822 bytes.
//
// This module intentionally uses mailauth's low-level APIs. The high-level
// authenticate() helper always evaluates SPF from Received headers, which is
// outside SecureInbox's trust boundary after delivery.
// ──────────────────────────────────────────────────────────────────────────────

import mailauth from 'mailauth';

const { dkimVerify, arc: verifyArc } = mailauth;

const DKIM_RESULT_PRIORITY = new Map([
    ['pass_aligned', 0],
    ['pass', 1],
    ['fail', 2],
    ['temperror', 3],
    ['permerror', 4],
    ['neutral', 5],
    ['none', 6],
]);

const NORMALIZED_RESULTS = new Set([
    'pass',
    'fail',
    'softfail',
    'neutral',
    'none',
    'temperror',
    'permerror',
]);

const INVALID_BODY_COMMENTS = new Set([
    'bad signature',
    'body hash did not verify',
]);
const MAX_PERSISTED_SIGNATURES = 32;

const normalizeText = (value, maxLength) => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeDkimResult = ({ result, comment } = {}) => {
    const normalizedResult = normalizeText(result, 32);
    const normalizedComment = normalizeText(comment, 128);

    // mailauth reports a body-hash mismatch as neutral. For SecureInbox this
    // is an invalid signature: the exact message bytes no longer verify.
    if (normalizedResult === 'neutral' && INVALID_BODY_COMMENTS.has(normalizedComment)) {
        return 'fail';
    }

    if (normalizedResult === 'policy') {
        return 'permerror';
    }

    return NORMALIZED_RESULTS.has(normalizedResult) ? normalizedResult : 'permerror';
};

const normalizeSignature = (row = {}) => ({
    result: normalizeDkimResult(row.status),
    domain: normalizeText(row.signingDomain, 253),
    selector: normalizeText(row.selector, 255),
    aligned: Boolean(row.status?.aligned),
});

const signaturePriority = (signature) => {
    const priorityKey = signature.result === 'pass' && signature.aligned
        ? 'pass_aligned'
        : signature.result;

    return DKIM_RESULT_PRIORITY.get(priorityKey) ?? Number.MAX_SAFE_INTEGER;
};

const selectRepresentativeSignature = (signatures) => {
    const sorted = [...signatures].sort(
        (left, right) => signaturePriority(left) - signaturePriority(right)
    );

    return sorted[0] || {
        result: 'none',
        domain: null,
        selector: null,
        aligned: false,
    };
};

const normalizeArc = (arcResult = {}) => {
    const result = normalizeText(arcResult.status?.result, 32);
    const normalizedResult = ['pass', 'fail', 'none'].includes(result) ? result : 'fail';
    const chainLength = Number.isInteger(arcResult.i) && arcResult.i > 0
        ? arcResult.i
        : 0;

    return {
        result: normalizedResult,
        chainLength,
    };
};

export const verifyWithMailauth = async (rawMessage, {
    resolver,
    minBitLength = 1024,
    curTime,
} = {}) => {
    const message = Buffer.isBuffer(rawMessage)
        ? rawMessage
        : Buffer.from(rawMessage);

    const dkimResult = await dkimVerify(message, {
        ...(resolver ? { resolver } : {}),
        minBitLength,
        ...(curTime ? { curTime } : {}),
    });

    // dkimResult.arc is deliberately non-enumerable in mailauth, but it is the
    // parsed chain required by the low-level ARC verifier.
    const arcResult = await verifyArc(dkimResult.arc, {
        ...(resolver ? { resolver } : {}),
        minBitLength,
    });

    const allSignatures = (dkimResult.results || []).map(normalizeSignature);
    const signatureLimitExceeded = allSignatures.length > MAX_PERSISTED_SIGNATURES;
    const signatures = allSignatures.slice(0, MAX_PERSISTED_SIGNATURES);
    const representative = selectRepresentativeSignature(allSignatures);

    // Only return the fields SecureInbox needs. mailauth also exposes the raw
    // signature, public key, DNS record, and signed headers; those must never
    // cross the worker boundary or be persisted.
    return {
        dkim: {
            result: representative.result,
            domain: representative.domain,
            selector: representative.selector,
            aligned: representative.aligned,
            source: 'local_verify',
            signatures,
        },
        arc: normalizeArc(arcResult),
        signatureLimitExceeded,
    };
};
