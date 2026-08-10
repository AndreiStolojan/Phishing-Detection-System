// Orchestrarea autentificării Gmail: SPF vine exclusiv din antetul de încredere,
// DKIM/ARC se verifică local, iar DMARC se evaluează cu politica DNS locală.

import { parseAuthenticationResults } from './authentication-results.parser.js';
import { verifyDkimAndArc } from './dkim-verifier.service.js';
import {
    evaluateDmarcAuthentication,
    isDomainAligned,
    resolveDmarcPolicy,
} from './dmarc.service.js';

const unavailableDmarc = () => ({
    result: 'temperror',
    policy: null,
    alignment: 'none',
    source: 'local_evaluate',
});

const alignmentLabel = ({ dmarcEvaluation, policyResult }) => {
    if (dmarcEvaluation.status !== 'pass') {
        return 'none';
    }

    const strictPass =
        (dmarcEvaluation.alignedSpf && policyResult.aspf === 's') ||
        (dmarcEvaluation.alignedDkim && policyResult.adkim === 's');
    return strictPass ? 'strict' : 'relaxed';
};

const normalizeDkimAlignment = ({ dkim, fromDomain, policyResult }) => {
    const mode = policyResult?.adkim || 'r';
    const signatures = (dkim.signatures || []).map((signature) => ({
        ...signature,
        aligned:
            signature.result === 'pass' &&
            isDomainAligned(signature.domain, fromDomain, mode),
    }));
    const representative =
        signatures.find((signature) => signature.result === 'pass' && signature.aligned) ||
        signatures.find((signature) => signature.result === 'pass') ||
        signatures.find((signature) => signature.result === 'fail') ||
        signatures[0];

    return {
        ...dkim,
        ...(representative
            ? {
                  result: representative.result,
                  domain: representative.domain,
                  selector: representative.selector,
                  aligned: representative.aligned,
              }
            : {}),
        signatures,
    };
};

const boundedFailureReason = (...reasons) =>
    reasons.filter(Boolean).join(',').slice(0, 180) || null;

export const evaluateEmailAuthentication = async ({
    rawHeaders,
    rawMessage,
    fromDomain,
    parseResults = parseAuthenticationResults,
    verifySignatures = verifyDkimAndArc,
    resolvePolicy = resolveDmarcPolicy,
    evaluateDmarc = evaluateDmarcAuthentication,
    evaluatedAt = () => new Date(),
} = {}) => {
    const gmailResults = parseResults(rawHeaders);
    const [signatureResults, policyResult] = await Promise.all([
        verifySignatures(rawMessage),
        resolvePolicy(fromDomain),
    ]);
    const trustedGmailHeader = gmailResults.authservId === 'mx.google.com';
    const signaturesAvailable = signatureResults.status === 'ok';
    const policyAvailable = policyResult.available === true;
    const spf = {
        result: gmailResults.spf?.result || 'none',
        domain: gmailResults.spf?.domain || null,
        source: 'gmail_header',
    };
    const dkim = normalizeDkimAlignment({
        dkim: signatureResults.dkim,
        fromDomain,
        policyResult,
    });

    let dmarc = unavailableDmarc();
    if (policyAvailable) {
        const dmarcEvaluation = evaluateDmarc({
            fromDomain,
            policyResult,
            spf,
            dkim,
        });
        dmarc = {
            result:
                ['unavailable', 'temperror'].includes(dmarcEvaluation.status)
                    ? 'temperror'
                    : dmarcEvaluation.status,
            policy: dmarcEvaluation.policy || policyResult.appliedPolicy || null,
            alignment: alignmentLabel({ dmarcEvaluation, policyResult }),
            source: 'local_evaluate',
        };
    }

    const failureReason = boundedFailureReason(
        trustedGmailHeader ? null : 'gmail_authentication_results_unavailable',
        signaturesAvailable ? null : signatureResults.failureReason,
        policyAvailable ? null : `dmarc_${policyResult.reason || 'unavailable'}`,
        dmarc.result === 'temperror' ? 'dmarc_temporary_error' : null
    );
    const temporaryMechanismError =
        spf.result === 'temperror' ||
        dkim.signatures.some((signature) => signature.result === 'temperror');
    const conclusiveAuthentication =
        dmarc.result === 'pass' || !temporaryMechanismError;
    const status =
        trustedGmailHeader &&
        signaturesAvailable &&
        policyAvailable &&
        conclusiveAuthentication
            ? 'ok'
            : 'unavailable';

    return {
        spf,
        dkim,
        dmarc,
        arc: signatureResults.arc,
        evaluatedAt: evaluatedAt(),
        status,
        failureReason,
    };
};

export const buildUnavailableAuthResults = (failureReason = 'authentication_unavailable') => ({
    spf: { result: 'none', domain: null, source: 'gmail_header' },
    dkim: {
        result: 'none',
        domain: null,
        selector: null,
        aligned: false,
        source: 'local_verify',
        signatures: [],
    },
    dmarc: {
        result: 'temperror',
        policy: null,
        alignment: 'none',
        source: 'local_evaluate',
    },
    arc: { result: 'none', chainLength: 0 },
    evaluatedAt: new Date(),
    status: 'unavailable',
    failureReason: String(failureReason).slice(0, 180),
});
