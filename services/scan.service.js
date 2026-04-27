import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';
import { analyzeEmailSemanticsWithOllama } from './ollama-semantic.service.js';
import { findSenderListMatchesForEmail } from './scan-list-match.service.js';
import { buildControlledRomanianExplanation } from './scan-explanation.service.js';
import { buildAiAnalysisInput } from './scan-ai-input.service.js';

export const CURRENT_SCAN_ENGINE_VERSION = 'rules-ai-v3';

const HIGH_RISK_ATTACHMENT_EXTENSIONS = new Set([
    'exe',
    'js',
    'scr',
    'bat',
    'cmd',
    'com',
    'pif',
    'lnk',
    'jar',
    'vbs',
    'msi',
    'iso',
    'img',
    'hta',
]);

const ARCHIVE_ATTACHMENT_EXTENSIONS = new Set([
    'zip',
    'rar',
    '7z',
    'gz',
    'tar',
]);

const LINK_PATTERN_RULES = {
    ip_address_link: {
        points: 25,
        details: 'Found URL that uses an IP address host.',
        reason: 'At least one link points to an IP address, which is often risky.',
    },
    embedded_credentials: {
        points: 20,
        details: 'Found URL with embedded credentials.',
        reason: 'At least one link contains embedded credentials.',
    },
    punycode_domain: {
        points: 20,
        details: 'Found URL using punycode domain.',
        reason: 'At least one link uses a punycode domain.',
    },
    very_long_url: {
        points: 10,
        details: 'Found URL longer than expected.',
        reason: 'At least one link is unusually long.',
    },
};

const BLOCKLIST_EMAIL_POINTS = 60;
const BLOCKLIST_DOMAIN_POINTS = 45;
const ALLOWLIST_EMAIL_REDUCTION = 18;
const ALLOWLIST_DOMAIN_REDUCTION = 10;
const MIN_RULE_SCORE_WITH_OTHER_SIGNALS = 5;

const toPublicScan = (scan) => ({
    _id: scan._id,
    emailId: scan.emailId,
    userId: scan.userId,
    score: scan.score,
    ruleScore: scan.ruleScore,
    aiScore: scan.aiScore,
    verdict: scan.verdict,
    reasons: scan.reasons,
    triggeredRules: scan.triggeredRules,
    scanSource: scan.scanSource,
    engineVersion: scan.engineVersion,
    aiSignals: scan.aiSignals,
    aiExplanation: scan.aiExplanation,
    scannedAt: scan.scannedAt,
    createdAt: scan.createdAt,
    updatedAt: scan.updatedAt,
});

const mapScoreToVerdict = (score) => {
    if (score >= 60) {
        return 'likely_phishing';
    }

    if (score >= 30) {
        return 'suspicious';
    }

    return 'safe';
};

const calculateRulesForEmail = (email) => {
    let score = 0;
    const reasons = [];
    const triggeredRules = [];

    const triggerRule = ({ rule, points, details, reason }) => {
        score += points;
        reasons.push(reason);
        triggeredRules.push({
            rule,
            points,
            details,
        });
    };

    if (
        email.replyToDomain &&
        email.senderDomain &&
        email.replyToDomain !== email.senderDomain
    ) {
        triggerRule({
            rule: 'reply_to_mismatch',
            points: 25,
            details: `Reply-To domain (${email.replyToDomain}) differs from sender domain (${email.senderDomain}).`,
            reason: 'Reply-To domain differs from sender domain.',
        });
    }

    if (email.hasShortenedUrl) {
        triggerRule({
            rule: 'shortened_url_detected',
            points: 20,
            details: 'At least one known URL shortener was found in the email links.',
            reason: 'Email contains shortened URL links.',
        });
    }

    for (const pattern of email.suspiciousLinkPatterns || []) {
        const patternRule = LINK_PATTERN_RULES[pattern];

        if (!patternRule) {
            continue;
        }

        triggerRule({
            rule: `suspicious_link_pattern:${pattern}`,
            points: patternRule.points,
            details: patternRule.details,
            reason: patternRule.reason,
        });
    }

    const attachmentExtensions = email.attachmentExtensions || [];
    const highRiskAttachments = attachmentExtensions.filter((ext) =>
        HIGH_RISK_ATTACHMENT_EXTENSIONS.has(ext)
    );
    const archiveAttachments = attachmentExtensions.filter((ext) =>
        ARCHIVE_ATTACHMENT_EXTENSIONS.has(ext)
    );

    if (highRiskAttachments.length > 0) {
        triggerRule({
            rule: 'high_risk_attachment_extension',
            points: 35,
            details: `Found high-risk attachment extensions: ${highRiskAttachments.join(', ')}.`,
            reason: 'Email contains high-risk attachment extensions.',
        });
    } else if (archiveAttachments.length > 0) {
        triggerRule({
            rule: 'archive_attachment_extension',
            points: 12,
            details: `Found archive attachment extensions: ${archiveAttachments.join(', ')}.`,
            reason: 'Email contains archive attachments.',
        });
    }

    const linkCount = email.linkCount || 0;

    if (linkCount >= 10) {
        triggerRule({
            rule: 'too_many_links_high',
            points: 25,
            details: `Email includes ${linkCount} links.`,
            reason: 'Email includes an unusually high number of links.',
        });
    } else if (linkCount >= 6) {
        triggerRule({
            rule: 'too_many_links_medium',
            points: 15,
            details: `Email includes ${linkCount} links.`,
            reason: 'Email includes many links.',
        });
    }

    return {
        score,
        ruleScore: score,
        reasons,
        triggeredRules,
    };
};

const applyListSignalsToRulesResult = ({ rulesResult, listMatches }) => {
    let score = rulesResult.ruleScore;
    const reasons = [...rulesResult.reasons];
    const triggeredRules = [...rulesResult.triggeredRules];

    const triggerRule = ({ rule, points, details, reason }) => {
        score += points;
        triggeredRules.push({
            rule,
            points,
            details,
        });

        if (reason) {
            reasons.push(reason);
        }
    };

    if (listMatches.blocklist.email) {
        triggerRule({
            rule: 'sender_blocklisted_email',
            points: BLOCKLIST_EMAIL_POINTS,
            details: `Sender email (${listMatches.senderEmail}) is present in user blocklist.`,
            reason: 'Sender email is in your blocklist.',
        });
    }

    if (listMatches.blocklist.domain) {
        triggerRule({
            rule: 'sender_blocklisted_domain',
            points: BLOCKLIST_DOMAIN_POINTS,
            details: `Sender domain (${listMatches.senderDomain}) is present in user blocklist.`,
            reason: 'Sender domain is in your blocklist.',
        });
    }

    const hasBlocklistMatch = listMatches.blocklist.email || listMatches.blocklist.domain;
    const hasAllowlistMatch = listMatches.allowlist.email || listMatches.allowlist.domain;

    if (hasBlocklistMatch && hasAllowlistMatch) {
        triggerRule({
            rule: 'sender_allowlist_ignored_due_to_blocklist',
            points: 0,
            details: 'Allowlist match detected, but blocklist takes priority for safety.',
            reason: 'Allowlist match was ignored because blocklist match has priority.',
        });
    }

    if (!hasBlocklistMatch && hasAllowlistMatch) {
        const matchedScopes = [];
        let requestedReduction = 0;

        if (listMatches.allowlist.email) {
            matchedScopes.push('email');
            requestedReduction += ALLOWLIST_EMAIL_REDUCTION;
        }

        if (listMatches.allowlist.domain) {
            matchedScopes.push('domain');
            requestedReduction += ALLOWLIST_DOMAIN_REDUCTION;
        }

        const minimumScore = rulesResult.ruleScore > 0 ? MIN_RULE_SCORE_WITH_OTHER_SIGNALS : 0;
        const maxAllowedReduction = Math.max(0, score - minimumScore);
        const appliedReduction = Math.min(requestedReduction, maxAllowedReduction);

        if (appliedReduction > 0) {
            triggerRule({
                rule: 'sender_allowlisted',
                points: -appliedReduction,
                details: `Sender matched allowlist by ${matchedScopes.join(
                    ' + '
                )}. Requested reduction ${requestedReduction} points; applied ${appliedReduction} points.`,
                reason: `Sender matched your allowlist (${matchedScopes.join(
                    ' + '
                )}), so risk score was reduced conservatively.`,
            });
        } else {
            triggerRule({
                rule: 'sender_allowlisted_no_reduction',
                points: 0,
                details:
                    'Sender matched allowlist, but score was already at minimum and could not be reduced further.',
                reason: 'Sender matched your allowlist, but score was already at minimum.',
            });
        }

        if (appliedReduction < requestedReduction && minimumScore > 0) {
            triggerRule({
                rule: 'sender_allowlist_reduction_capped',
                points: 0,
                details: `Allowlist reduction capped to keep at least ${minimumScore} rule points when other risk signals exist.`,
                reason: 'Allowlist reduction was capped so other risk signals remain visible.',
            });
        }
    }

    if (score < 0) {
        score = 0;
    }

    return {
        score,
        ruleScore: score,
        reasons,
        triggeredRules,
    };
};

const calculateAiScoreFromSignals = (aiSignals) => {
    let aiScore = 0;
    const aiTriggeredRules = [];
    const aiReasons = [];

    const triggerAiRule = ({ rule, points, reason, details }) => {
        aiScore += points;
        aiReasons.push(reason);
        aiTriggeredRules.push({
            rule,
            points,
            details,
        });
    };

    if (!aiSignals || aiSignals.status !== 'evaluated') {
        return {
            aiScore,
            aiReasons,
            aiTriggeredRules,
        };
    }

    if (aiSignals.urgencyLevel === 'high') {
        triggerAiRule({
            rule: 'ai_semantic:urgency_high',
            points: 8,
            reason: 'AI semantic: high urgency language detected.',
            details: 'Semantic model flagged urgent pressure language as high.',
        });
    } else if (aiSignals.urgencyLevel === 'medium') {
        triggerAiRule({
            rule: 'ai_semantic:urgency_medium',
            points: 4,
            reason: 'AI semantic: medium urgency language detected.',
            details: 'Semantic model flagged urgent pressure language as medium.',
        });
    }

    if (aiSignals.sensitiveDataRequest) {
        triggerAiRule({
            rule: 'ai_semantic:sensitive_data_request',
            points: 20,
            reason: 'AI semantic: request for sensitive data detected.',
            details: 'Semantic model detected password/card/OTP style data request.',
        });
    }

    if (aiSignals.loginOrActionRequest) {
        triggerAiRule({
            rule: 'ai_semantic:login_or_action_request',
            points: 8,
            reason: 'AI semantic: login or rapid action request detected.',
            details: 'Semantic model detected push toward login or immediate user action.',
        });
    }

    if (aiSignals.socialEngineeringLevel === 'high') {
        triggerAiRule({
            rule: 'ai_semantic:social_engineering_high',
            points: 12,
            reason: 'AI semantic: high social engineering pressure detected.',
            details: 'Semantic model flagged social engineering patterns as high.',
        });
    } else if (aiSignals.socialEngineeringLevel === 'medium') {
        triggerAiRule({
            rule: 'ai_semantic:social_engineering_medium',
            points: 6,
            reason: 'AI semantic: medium social engineering pressure detected.',
            details: 'Semantic model flagged social engineering patterns as medium.',
        });
    }

    if (aiSignals.brandImpersonationSuspected) {
        triggerAiRule({
            rule: 'ai_semantic:brand_impersonation_suspected',
            points: 10,
            reason: 'AI semantic: possible brand impersonation detected.',
            details: 'Semantic model found likely impersonation of known organization/brand.',
        });
    }

    if (aiScore > 30) {
        aiScore = 30;
    }

    return {
        aiScore,
        aiReasons,
        aiTriggeredRules,
    };
};

const findOwnedEmail = async ({ emailId, userId }) => {
    if (!mongoose.Types.ObjectId.isValid(emailId)) {
        throw createError('Invalid email id', 400, [], 'INVALID_EMAIL_ID');
    }

    const email = await Email.findOne({ _id: emailId, userId });

    if (!email) {
        throw createError('Email not found', 404, [], 'EMAIL_NOT_FOUND');
    }

    return email;
};

const cleanupDuplicateScans = async ({ userId, emailId, keepScanId }) => {
    await Scan.deleteMany({
        userId,
        emailId,
        _id: { $ne: keepScanId },
    });
};

const getCurrentScanForEmail = async ({ userId, emailId }) =>
    Scan.findOne({ userId, emailId }).sort({ updatedAt: -1, scannedAt: -1 });

const upsertCurrentScanForEmail = async ({
    email,
    scanSource,
    result,
    aiSignals,
    aiExplanation,
}) => {
    const now = new Date();
    const existingScan = await getCurrentScanForEmail({
        userId: email.userId,
        emailId: email._id,
    });

    if (!existingScan) {
        const createdScan = await Scan.create({
            emailId: email._id,
            userId: email.userId,
            score: result.score,
            ruleScore: result.ruleScore,
            aiScore: result.aiScore,
            verdict: result.verdict,
            reasons: result.reasons,
            triggeredRules: result.triggeredRules,
            scanSource,
            engineVersion: CURRENT_SCAN_ENGINE_VERSION,
            aiSignals,
            aiExplanation,
            scannedAt: now,
        });

        return createdScan;
    }

    existingScan.score = result.score;
    existingScan.ruleScore = result.ruleScore;
    existingScan.aiScore = result.aiScore;
    existingScan.verdict = result.verdict;
    existingScan.reasons = result.reasons;
    existingScan.triggeredRules = result.triggeredRules;
    existingScan.scanSource = scanSource;
    existingScan.engineVersion = CURRENT_SCAN_ENGINE_VERSION;
    existingScan.aiSignals = aiSignals;
    existingScan.aiExplanation = aiExplanation;
    existingScan.scannedAt = now;

    await existingScan.save();
    await cleanupDuplicateScans({
        userId: email.userId,
        emailId: email._id,
        keepScanId: existingScan._id,
    });

    return existingScan;
};

export const scanEmailWithRules = async ({
    userId,
    emailId,
    scanSource = 'manual',
    skipIfCurrentEngineExists = false,
}) => {
    const email = await findOwnedEmail({ emailId, userId });
    const aiInput = buildAiAnalysisInput(email);
    const currentScan = await getCurrentScanForEmail({ userId, emailId: email._id });

    if (
        skipIfCurrentEngineExists &&
        currentScan &&
        currentScan.engineVersion === CURRENT_SCAN_ENGINE_VERSION
    ) {
        await cleanupDuplicateScans({
            userId,
            emailId: email._id,
            keepScanId: currentScan._id,
        });

        return {
            status: 'skipped_current_engine',
            scan: toPublicScan(currentScan),
            aiInput,
        };
    }

    const rulesResult = calculateRulesForEmail(email);
    const listMatches = await findSenderListMatchesForEmail({
        userId: email.userId,
        email,
    });
    const rulesWithListSignals = applyListSignalsToRulesResult({
        rulesResult,
        listMatches,
    });
    const aiSignals = await analyzeEmailSemanticsWithOllama({
        analysisInput: aiInput,
    });
    const aiScoreResult = calculateAiScoreFromSignals(aiSignals);
    const finalScore = rulesWithListSignals.ruleScore + aiScoreResult.aiScore;
    const finalResult = {
        score: finalScore,
        ruleScore: rulesWithListSignals.ruleScore,
        aiScore: aiScoreResult.aiScore,
        verdict: mapScoreToVerdict(finalScore),
        reasons: [...rulesWithListSignals.reasons, ...aiScoreResult.aiReasons],
        triggeredRules: [
            ...rulesWithListSignals.triggeredRules,
            ...aiScoreResult.aiTriggeredRules,
        ],
    };
    const aiExplanation = buildControlledRomanianExplanation({
        verdict: finalResult.verdict,
        triggeredRules: finalResult.triggeredRules,
        aiSignals,
    });

    const scan = await upsertCurrentScanForEmail({
        email,
        scanSource,
        result: finalResult,
        aiSignals,
        aiExplanation,
    });

    return {
        status: 'scanned',
        scan: toPublicScan(scan),
        aiInput,
    };
};

export const runSyncScanPipeline = async ({
    userId,
    insertedEmailIds = [],
    updatedEmailIds = [],
}) => {
    const uniqueInsertedIds = [...new Set(insertedEmailIds.map((id) => String(id)))];
    const uniqueUpdatedIds = [...new Set(updatedEmailIds.map((id) => String(id)))];

    const summary = {
        insertedCandidatesCount: uniqueInsertedIds.length,
        updatedCandidatesCount: uniqueUpdatedIds.length,
        scannedCount: 0,
        scannedInsertedCount: 0,
        scannedUpdatedCount: 0,
        skippedCount: 0,
        skippedAlreadyCurrentCount: 0,
        failedCount: 0,
    };

    for (const emailId of uniqueInsertedIds) {
        try {
            const result = await scanEmailWithRules({
                userId,
                emailId,
                scanSource: 'sync',
                skipIfCurrentEngineExists: false,
            });

            if (result.status === 'scanned') {
                summary.scannedCount += 1;
                summary.scannedInsertedCount += 1;
            } else {
                summary.skippedCount += 1;
                summary.skippedAlreadyCurrentCount += 1;
            }
        } catch {
            summary.failedCount += 1;
        }
    }

    for (const emailId of uniqueUpdatedIds) {
        try {
            const result = await scanEmailWithRules({
                userId,
                emailId,
                scanSource: 'sync',
                skipIfCurrentEngineExists: true,
            });

            if (result.status === 'scanned') {
                summary.scannedCount += 1;
                summary.scannedUpdatedCount += 1;
            } else {
                summary.skippedCount += 1;
                summary.skippedAlreadyCurrentCount += 1;
            }
        } catch {
            summary.failedCount += 1;
        }
    }

    return summary;
};

export const getLatestScanForEmail = async ({ userId, emailId }) => {
    const email = await findOwnedEmail({ emailId, userId });

    const currentScan = await getCurrentScanForEmail({
        userId,
        emailId: email._id,
    });

    if (!currentScan) {
        throw createError('No scan found for this email', 404, [], 'SCAN_NOT_FOUND');
    }

    await cleanupDuplicateScans({
        userId,
        emailId: email._id,
        keepScanId: currentScan._id,
    });

    return toPublicScan(currentScan);
};
