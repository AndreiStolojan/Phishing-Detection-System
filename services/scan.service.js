import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';
import { buildAiAnalysisInput } from './scan-ai-input.service.js';

export const CURRENT_SCAN_ENGINE_VERSION = 'rules-v1';

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

const toPublicScan = (scan) => ({
    _id: scan._id,
    emailId: scan.emailId,
    userId: scan.userId,
    score: scan.score,
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
        reasons,
        triggeredRules,
        verdict: mapScoreToVerdict(score),
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
            verdict: result.verdict,
            reasons: result.reasons,
            triggeredRules: result.triggeredRules,
            scanSource,
            engineVersion: CURRENT_SCAN_ENGINE_VERSION,
            aiSignals: {
                status: 'not_evaluated',
            },
            aiExplanation: '',
            scannedAt: now,
        });

        return createdScan;
    }

    existingScan.score = result.score;
    existingScan.verdict = result.verdict;
    existingScan.reasons = result.reasons;
    existingScan.triggeredRules = result.triggeredRules;
    existingScan.scanSource = scanSource;
    existingScan.engineVersion = CURRENT_SCAN_ENGINE_VERSION;
    existingScan.aiSignals = {
        status: 'not_evaluated',
    };
    existingScan.aiExplanation = '';
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

    const result = calculateRulesForEmail(email);
    const scan = await upsertCurrentScanForEmail({
        email,
        scanSource,
        result,
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
