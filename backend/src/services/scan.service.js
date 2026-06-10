import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';
import User from '../models/user.model.js';
import { analyzeEmailSemanticsWithOllama } from './ollama-semantic.service.js';
import { generateNaturalExplanationWithOllama } from './ollama-explanation.service.js';
import {
    buildControlledExplanationObject,
} from './scan-explanation.service.js';
import { buildAiAnalysisInput } from './scan-ai-input.service.js';
import { verifySenderBrand } from './brand-verification.service.js';
import {
    AI_SCORE_MAX,
    AI_SIGNAL_WEIGHTS,
    RISK_THRESHOLDS,
    RULE_WEIGHTS,
    SCORE_MAX,
    applyVerifiedBrandModifier,
} from '../config/scoring.config.js';

// Bumped v5 -> v6 with the verified-brand context modifier layer. Old scans keep
// their v5 score until the email is rescanned (no retroactive bulk rescoring).
export const CURRENT_SCAN_ENGINE_VERSION = 'rules-ai-v6';

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

// Points come from the central config (RULE_WEIGHTS); only the copy lives here.
const LINK_PATTERN_RULES = {
    ip_address_link: {
        points: RULE_WEIGHTS.ip_address_link,
        details: 'Found URL that uses an IP address host.',
        reason: 'At least one link points to an IP address, which is often risky.',
    },
    embedded_credentials: {
        points: RULE_WEIGHTS.embedded_credentials,
        details: 'Found URL with embedded credentials.',
        reason: 'At least one link contains embedded credentials.',
    },
    punycode_domain: {
        points: RULE_WEIGHTS.punycode_domain,
        details: 'Found URL using punycode domain.',
        reason: 'At least one link uses a punycode domain.',
    },
    very_long_url: {
        points: RULE_WEIGHTS.very_long_url,
        details: 'Found URL longer than expected.',
        reason: 'At least one link is unusually long.',
    },
};

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
    aiExplanationMeta: scan.aiExplanationMeta,
    senderVerifiedBrand: scan.senderVerifiedBrand,
    verifiedBrandName: scan.verifiedBrandName,
    scannedAt: scan.scannedAt,
    createdAt: scan.createdAt,
    updatedAt: scan.updatedAt,
});

export const mapScoreToVerdict = (score) => {
    if (score >= RISK_THRESHOLDS.likelyPhishing) {
        return 'likely_phishing';
    }

    if (score >= RISK_THRESHOLDS.suspicious) {
        return 'suspicious';
    }

    return 'safe';
};

export const calculateRulesForEmail = (email, brandContext = {}) => {
    let score = 0;
    const reasons = [];
    const triggeredRules = [];

    // modifierKey defaults to the rule id. For the rules that the verified-brand layer
    // discounts (reply_to_mismatch, too_many_links_*), the rule id already equals the
    // modifier key, so the default is correct; the suspicious_link_pattern:* rules are
    // not in the modifier table and therefore keep full weight.
    const triggerRule = ({ rule, modifierKey, points, details, reason }) => {
        const effectivePoints = applyVerifiedBrandModifier(
            modifierKey || rule,
            points,
            brandContext
        );

        if (effectivePoints <= 0) {
            return;
        }

        score += effectivePoints;
        reasons.push(reason);
        triggeredRules.push({
            rule,
            points: effectivePoints,
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
            points: RULE_WEIGHTS.reply_to_mismatch,
            details: `Reply-To domain (${email.replyToDomain}) differs from sender domain (${email.senderDomain}).`,
            reason: 'Reply-To domain differs from sender domain.',
        });
    }

    if (email.hasShortenedUrl) {
        triggerRule({
            rule: 'shortened_url_detected',
            points: RULE_WEIGHTS.shortened_url_detected,
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
            points: RULE_WEIGHTS.high_risk_attachment_extension,
            details: `Found high-risk attachment extensions: ${highRiskAttachments.join(', ')}.`,
            reason: 'Email contains high-risk attachment extensions.',
        });
    } else if (archiveAttachments.length > 0) {
        triggerRule({
            rule: 'archive_attachment_extension',
            points: RULE_WEIGHTS.archive_attachment_extension,
            details: `Found archive attachment extensions: ${archiveAttachments.join(', ')}.`,
            reason: 'Email contains archive attachments.',
        });
    }

    const linkCount = email.linkCount || 0;

    if (linkCount >= 10) {
        triggerRule({
            rule: 'too_many_links_high',
            points: RULE_WEIGHTS.too_many_links_high,
            details: `Email includes ${linkCount} links.`,
            reason: 'Email includes an unusually high number of links.',
        });
    } else if (linkCount >= 6) {
        triggerRule({
            rule: 'too_many_links_medium',
            points: RULE_WEIGHTS.too_many_links_medium,
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

export const calculateAiScoreFromSignals = (aiSignals, brandContext = {}) => {
    let aiScore = 0;
    const aiTriggeredRules = [];
    const aiReasons = [];

    // modifierKey is the verified-brand modifier table key (without the ai_semantic:
    // prefix). When senderVerifiedBrand is true the points are discounted; a signal
    // discounted to 0 (e.g. brand_impersonation_suspected) is dropped entirely so it
    // neither scores nor shows up as a triggered warning.
    const triggerAiRule = ({ rule, modifierKey, points, reason, details }) => {
        const effectivePoints = applyVerifiedBrandModifier(modifierKey, points, brandContext);

        if (effectivePoints <= 0) {
            return;
        }

        aiScore += effectivePoints;
        aiReasons.push(reason);
        aiTriggeredRules.push({
            rule,
            points: effectivePoints,
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
            modifierKey: 'urgency_high',
            points: AI_SIGNAL_WEIGHTS.urgency_high,
            reason: 'AI semantic: high urgency language detected.',
            details: 'Semantic model flagged urgent pressure language as high.',
        });
    } else if (aiSignals.urgencyLevel === 'medium') {
        triggerAiRule({
            rule: 'ai_semantic:urgency_medium',
            modifierKey: 'urgency_medium',
            points: AI_SIGNAL_WEIGHTS.urgency_medium,
            reason: 'AI semantic: medium urgency language detected.',
            details: 'Semantic model flagged urgent pressure language as medium.',
        });
    }

    if (aiSignals.sensitiveDataRequest) {
        triggerAiRule({
            rule: 'ai_semantic:sensitive_data_request',
            modifierKey: 'sensitive_data_request',
            points: AI_SIGNAL_WEIGHTS.sensitive_data_request,
            reason: 'AI semantic: request for sensitive data detected.',
            details: 'Semantic model detected password/card/OTP style data request.',
        });
    }

    if (aiSignals.loginOrActionRequest) {
        triggerAiRule({
            rule: 'ai_semantic:login_or_action_request',
            modifierKey: 'login_or_action_request',
            points: AI_SIGNAL_WEIGHTS.login_or_action_request,
            reason: 'AI semantic: login or rapid action request detected.',
            details: 'Semantic model detected push toward login or immediate user action.',
        });
    }

    if (aiSignals.socialEngineeringLevel === 'high') {
        triggerAiRule({
            rule: 'ai_semantic:social_engineering_high',
            modifierKey: 'social_engineering_high',
            points: AI_SIGNAL_WEIGHTS.social_engineering_high,
            reason: 'AI semantic: high social engineering pressure detected.',
            details: 'Semantic model flagged social engineering patterns as high.',
        });
    } else if (aiSignals.socialEngineeringLevel === 'medium') {
        triggerAiRule({
            rule: 'ai_semantic:social_engineering_medium',
            modifierKey: 'social_engineering_medium',
            points: AI_SIGNAL_WEIGHTS.social_engineering_medium,
            reason: 'AI semantic: medium social engineering pressure detected.',
            details: 'Semantic model flagged social engineering patterns as medium.',
        });
    }

    if (aiSignals.brandImpersonationSuspected) {
        triggerAiRule({
            rule: 'ai_semantic:brand_impersonation_suspected',
            modifierKey: 'brand_impersonation_suspected',
            points: AI_SIGNAL_WEIGHTS.brand_impersonation_suspected,
            reason: 'AI semantic: possible brand impersonation detected.',
            details: 'Semantic model found likely impersonation of known organization/brand.',
        });
    }

    // AI is a secondary signal: capped so it can escalate risk but never, alone,
    // declare phishing (AI_SCORE_MAX < the likely_phishing threshold).
    aiScore = Math.min(aiScore, AI_SCORE_MAX);

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

const getUserAiEnabled = async (userId) => {
    const user = await User.findById(userId).select('settings.aiEnabled');

    return Boolean(user?.settings?.aiEnabled);
};

const buildAiDisabledSignals = () => ({
    status: 'disabled',
    provider: 'ollama',
    mode: 'local',
    latencyMs: 0,
    evaluatedAt: new Date(),
    disabledReason: 'ai_disabled',
});

const buildFallbackExplanationResult = ({
    verdict,
    triggeredRules,
    aiSignals,
    senderVerifiedBrand,
    verifiedBrandName,
    fallbackReason,
}) => ({
    explanation: buildControlledExplanationObject({
        verdict,
        triggeredRules,
        aiSignals,
        senderVerifiedBrand,
        verifiedBrandName,
    }),
    meta: {
        status: 'fallback',
        source: 'backend',
        mode: 'controlled_template',
        promptVersion: 'explanation-fallback-v1',
        latencyMs: 0,
        fallbackUsed: true,
        fallbackReason,
        evaluatedAt: new Date(),
    },
});

const isCurrentScanValidForCurrentAiSetting = ({ currentScan, aiEnabled }) => {
    if (!currentScan || currentScan.engineVersion !== CURRENT_SCAN_ENGINE_VERSION) {
        return false;
    }

    if (!aiEnabled) {
        return true;
    }

    return (
        currentScan.aiSignals?.status === 'evaluated' &&
        currentScan.aiExplanationMeta?.fallbackReason !== 'ai_disabled'
    );
};

const isDuplicateKeyError = (error) => error?.code === 11000;

const hasUserVerdict = (email) => {
    const userVerdict = email?.userVerdict;

    if (userVerdict === undefined || userVerdict === null) {
        return false;
    }

    if (typeof userVerdict === 'string') {
        return userVerdict.trim().length > 0;
    }

    return true;
};

const toObjectId = (value) => {
    const stringValue = String(value);

    if (!mongoose.Types.ObjectId.isValid(stringValue)) {
        return null;
    }

    return new mongoose.Types.ObjectId(stringValue);
};

const getReviewedEmailIdSet = async ({ userId, emailIds }) => {
    const userObjectId = toObjectId(userId);
    const emailObjectIds = emailIds.map(toObjectId).filter(Boolean);

    if (!userObjectId || emailObjectIds.length === 0) {
        return new Set();
    }

    const reviewedEmails = await Email.collection
        .find(
            {
                _id: { $in: emailObjectIds },
                userId: userObjectId,
                userVerdict: { $exists: true, $ne: null },
            },
            {
                projection: {
                    _id: 1,
                    userVerdict: 1,
                },
            }
        )
        .toArray();

    return new Set(
        reviewedEmails
            .filter(hasUserVerdict)
            .map((email) => String(email._id))
    );
};

const upsertCurrentScanForEmail = async ({
    email,
    scanSource,
    result,
    aiSignals,
    aiExplanation,
    aiExplanationMeta,
}) => {
    const now = new Date();

    const filter = {
        userId: email.userId,
        emailId: email._id,
    };
    const update = {
        $set: {
            score: result.score,
            ruleScore: result.ruleScore,
            aiScore: result.aiScore,
            verdict: result.verdict,
            reasons: result.reasons,
            triggeredRules: result.triggeredRules,
            senderVerifiedBrand: result.senderVerifiedBrand,
            verifiedBrandName: result.verifiedBrandName,
            scanSource,
            engineVersion: CURRENT_SCAN_ENGINE_VERSION,
            aiSignals,
            aiExplanation,
            aiExplanationMeta,
            scannedAt: now,
        },
        $setOnInsert: {
            emailId: email._id,
            userId: email.userId,
        },
    };
    const options = {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        sort: {
            scannedAt: -1,
            updatedAt: -1,
            createdAt: -1,
        },
    };
    let currentScan;

    try {
        currentScan = await Scan.findOneAndUpdate(filter, update, options);
    } catch (error) {
        if (!isDuplicateKeyError(error)) {
            throw error;
        }

        currentScan = await Scan.findOneAndUpdate(filter, { $set: update.$set }, {
            new: true,
            runValidators: true,
            sort: {
                scannedAt: -1,
                updatedAt: -1,
                createdAt: -1,
            },
        });

        if (!currentScan) {
            throw error;
        }
    }

    await cleanupDuplicateScans({
        userId: email.userId,
        emailId: email._id,
        keepScanId: currentScan._id,
    });

    return currentScan;
};

export const scanEmailWithRules = async ({
    userId,
    emailId,
    scanSource = 'manual',
    skipIfCurrentEngineExists = false,
}) => {
    const email = await findOwnedEmail({ emailId, userId });
    const brandContext = verifySenderBrand({ senderDomain: email.senderDomain });
    const aiInput = buildAiAnalysisInput(email, brandContext);
    const aiEnabled = await getUserAiEnabled(userId);
    const currentScan = await getCurrentScanForEmail({ userId, emailId: email._id });

    if (
        skipIfCurrentEngineExists &&
        isCurrentScanValidForCurrentAiSetting({ currentScan, aiEnabled })
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

    const rulesResult = calculateRulesForEmail(email, brandContext);
    const aiSignals = aiEnabled
        ? await analyzeEmailSemanticsWithOllama({
              analysisInput: aiInput,
              enabled: true,
              brandContext,
          })
        : buildAiDisabledSignals();
    const aiScoreResult = calculateAiScoreFromSignals(aiSignals, brandContext);
    const finalScore = Math.min(SCORE_MAX, rulesResult.ruleScore + aiScoreResult.aiScore);
    const finalResult = {
        score: finalScore,
        ruleScore: rulesResult.ruleScore,
        aiScore: aiScoreResult.aiScore,
        verdict: mapScoreToVerdict(finalScore),
        reasons: [...rulesResult.reasons, ...aiScoreResult.aiReasons],
        triggeredRules: [
            ...rulesResult.triggeredRules,
            ...aiScoreResult.aiTriggeredRules,
        ],
        senderVerifiedBrand: Boolean(brandContext.senderVerifiedBrand),
        verifiedBrandName: brandContext.brandName || null,
    };
    const shouldGenerateNaturalExplanation = aiEnabled;
    const explanationResult = shouldGenerateNaturalExplanation
        ? await generateNaturalExplanationWithOllama({
              verdict: finalResult.verdict,
              score: finalResult.score,
              ruleScore: finalResult.ruleScore,
              aiScore: finalResult.aiScore,
              triggeredRules: finalResult.triggeredRules,
              aiSignals,
          })
        : buildFallbackExplanationResult({
              verdict: finalResult.verdict,
              triggeredRules: finalResult.triggeredRules,
              aiSignals,
              senderVerifiedBrand: finalResult.senderVerifiedBrand,
              verifiedBrandName: finalResult.verifiedBrandName,
              fallbackReason: 'ai_disabled',
          });
    const finalExplanationResult =
        shouldGenerateNaturalExplanation && explanationResult.meta.status !== 'generated'
            ? buildFallbackExplanationResult({
                  verdict: finalResult.verdict,
                  triggeredRules: finalResult.triggeredRules,
                  aiSignals,
                  senderVerifiedBrand: finalResult.senderVerifiedBrand,
                  verifiedBrandName: finalResult.verifiedBrandName,
                  fallbackReason: explanationResult.meta.fallbackReason || 'ollama_failed',
              })
            : explanationResult.meta.status === 'generated'
              ? {
                  explanation: explanationResult.explanation,
                  meta: {
                      ...explanationResult.meta,
                      fallbackUsed: false,
                      fallbackReason: null,
                  },
                }
              : explanationResult;

    const scan = await upsertCurrentScanForEmail({
        email,
        scanSource,
        result: finalResult,
        aiSignals,
        aiExplanation: finalExplanationResult.explanation,
        aiExplanationMeta: finalExplanationResult.meta,
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
    const reviewedEmailIds = await getReviewedEmailIdSet({
        userId,
        emailIds: [...uniqueInsertedIds, ...uniqueUpdatedIds],
    });

    const summary = {
        insertedCandidatesCount: uniqueInsertedIds.length,
        updatedCandidatesCount: uniqueUpdatedIds.length,
        scannedCount: 0,
        scannedInsertedCount: 0,
        scannedUpdatedCount: 0,
        skippedCount: 0,
        skippedAlreadyCurrentCount: 0,
        skippedReviewedCount: 0,
        failedCount: 0,
    };

    const insertedResults = await Promise.all(
        uniqueInsertedIds.map(async (emailId) => {
            if (reviewedEmailIds.has(emailId)) return { outcome: 'skipped_reviewed' };
            try {
                const result = await scanEmailWithRules({
                    userId,
                    emailId,
                    scanSource: 'sync',
                    skipIfCurrentEngineExists: false,
                });
                return { outcome: result.status === 'scanned' ? 'scanned' : 'skipped_current' };
            } catch {
                return { outcome: 'failed' };
            }
        }),
    );

    const updatedResults = await Promise.all(
        uniqueUpdatedIds.map(async (emailId) => {
            if (reviewedEmailIds.has(emailId)) return { outcome: 'skipped_reviewed' };
            try {
                const result = await scanEmailWithRules({
                    userId,
                    emailId,
                    scanSource: 'sync',
                    skipIfCurrentEngineExists: true,
                });
                return { outcome: result.status === 'scanned' ? 'scanned' : 'skipped_current' };
            } catch {
                return { outcome: 'failed' };
            }
        }),
    );

    for (const { outcome } of insertedResults) {
        if (outcome === 'scanned') { summary.scannedCount += 1; summary.scannedInsertedCount += 1; }
        else if (outcome === 'failed') { summary.failedCount += 1; }
        else { summary.skippedCount += 1; if (outcome === 'skipped_reviewed') summary.skippedReviewedCount += 1; else summary.skippedAlreadyCurrentCount += 1; }
    }

    for (const { outcome } of updatedResults) {
        if (outcome === 'scanned') { summary.scannedCount += 1; summary.scannedUpdatedCount += 1; }
        else if (outcome === 'failed') { summary.failedCount += 1; }
        else { summary.skippedCount += 1; if (outcome === 'skipped_reviewed') summary.skippedReviewedCount += 1; else summary.skippedAlreadyCurrentCount += 1; }
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
