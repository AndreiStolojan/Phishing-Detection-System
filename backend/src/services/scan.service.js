// ─────────────────────────────────────────────────────────────────────────────
// scan.service.js — INIMA aplicației: motorul de scanare a emailurilor.
//
// Ce face, pe scurt: ia un email deja salvat în baza de date, îi calculează un
// SCOR de risc (reguli fixe + semnale AI), îl traduce într-un VERDICT
// (safe / suspicious / likely_phishing), îi atașează o explicație și salvează
// rezultatul ca un "scan". Folosit atât la sincronizare (automat), cât și la
// apăsarea butonului "Scan again" (manual).
//
// Modelul de scor: scorFinal = min(100, scorReguli + scorAI), apoi pragurile din
// scoring.config.js dau verdictul. Detalii: docs/EXPLICATIE_BACKEND.md §4.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto';
import mongoose from 'mongoose'; // utilitar pentru a valida id-urile MongoDB

import createError from '../common/errors/create-error.js';
import { mapWithConcurrency } from '../common/async/map-with-concurrency.js';
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
import { getSenderListContextForEmail } from './sender-list.service.js';
import { isAiSemanticGloballyEnabled, SCAN_CONCURRENCY } from '../config/env.js';
import { createDetectionContext } from '../detection/context.js';
import { runDetection } from '../detection/index.js';
import {
    collectAiSignals,
} from '../detection/providers/ai-semantic.provider.js';
import {
    collectAttachmentSignals,
} from '../detection/providers/attachment-extension.provider.js';
import {
    collectLinkSignals,
} from '../detection/providers/link-analysis.provider.js';
import {
    collectReplyToSignals,
} from '../detection/providers/reply-to.provider.js';
import {
    collectSenderListSignals,
} from '../detection/providers/sender-list.provider.js';
import {
    mapScoreToVerdict,
    scoreSignals,
} from '../detection/scorer.js';

// Versiunea motorului. Urcată v8 -> v9 pentru autentificarea emailului.
// Scanările vechi își păstrează scorul anterior până la o
// rescanare (nu rescorăm retroactiv toată baza de date).
export const CURRENT_SCAN_ENGINE_VERSION = 'rules-ai-v9';

const DEFAULT_SCAN_CONCURRENCY = 4;
const MAX_SCAN_CONCURRENCY = 10;

const getScanConcurrency = () => {
    const parsedValue = Number.parseInt(String(SCAN_CONCURRENCY || ''), 10);

    if (!Number.isFinite(parsedValue)) {
        return DEFAULT_SCAN_CONCURRENCY;
    }

    return Math.min(Math.max(parsedValue, 1), MAX_SCAN_CONCURRENCY);
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
    senderListMatch: scan.senderListMatch,
    scannedAt: scan.scannedAt,
    createdAt: scan.createdAt,
    updatedAt: scan.updatedAt,
});

export { mapScoreToVerdict };

// Fațade sincrone de compatibilitate pentru testele și consumatorii existenți.
// Evaluarea propriu-zisă trăiește în provideri și scorer, nu în acest serviciu.
export const calculateRulesForEmail = (email, scanContext = {}) => {
    const ctx = { email, scanContext };
    const signals = [
        ...collectSenderListSignals(ctx),
        ...collectReplyToSignals(ctx),
        ...collectLinkSignals(ctx),
        ...collectAttachmentSignals(ctx),
    ].map((signal, sequence) => ({
        ...signal,
        kind: 'rule',
        sequence,
    }));
    const result = scoreSignals(signals, scanContext);

    return {
        score: result.ruleScore,
        ruleScore: result.ruleScore,
        reasons: result.reasons,
        triggeredRules: result.triggeredRules,
    };
};

export const calculateAiScoreFromSignals = (aiSignals, scanContext = {}) => {
    const signals = collectAiSignals(aiSignals).map((signal, sequence) => ({
        ...signal,
        kind: 'ai',
        sequence,
    }));
    const result = scoreSignals(signals, scanContext);

    return {
        aiScore: result.aiScore,
        aiReasons: result.reasons,
        aiTriggeredRules: result.triggeredRules,
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
    if (!isAiSemanticGloballyEnabled()) {
        return false;
    }

    const user = await User.findById(userId).select('settings.aiEnabled');

    return Boolean(user?.settings?.aiEnabled);
};

const buildFallbackExplanationResult = ({
    verdict,
    triggeredRules,
    aiSignals,
    senderVerifiedBrand,
    verifiedBrandName,
    senderListMatch,
    fallbackReason,
}) => ({
    explanation: buildControlledExplanationObject({
        verdict,
        triggeredRules,
        aiSignals,
        senderVerifiedBrand,
        verifiedBrandName,
        senderListMatch,
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

export const buildAuthResultsFingerprint = (authResults) => {
    const dkimSignatures = Array.isArray(authResults?.dkim?.signatures)
        ? authResults.dkim.signatures.map(({ result, domain, selector, aligned }) => ({
              result: result || 'none',
              domain: domain || null,
              selector: selector || null,
              aligned: Boolean(aligned),
          }))
        : [];
    const normalized = {
        status: authResults?.status || 'unavailable',
        spf: {
            result: authResults?.spf?.result || 'none',
            domain: authResults?.spf?.domain || null,
        },
        dkim: {
            result: authResults?.dkim?.result || 'none',
            domain: authResults?.dkim?.domain || null,
            selector: authResults?.dkim?.selector || null,
            aligned: Boolean(authResults?.dkim?.aligned),
            signatures: dkimSignatures,
        },
        dmarc: {
            result: authResults?.dmarc?.result || 'none',
            policy: authResults?.dmarc?.policy || null,
            alignment: authResults?.dmarc?.alignment || 'none',
        },
        arc: {
            result: authResults?.arc?.result || 'none',
            chainLength: Number(authResults?.arc?.chainLength) || 0,
        },
    };

    return crypto
        .createHash('sha256')
        .update(JSON.stringify(normalized))
        .digest('hex');
};

export const isCurrentScanValidForCurrentAiSetting = ({
    currentScan,
    aiEnabled,
    authResultsFingerprint,
}) => {
    if (!currentScan || currentScan.engineVersion !== CURRENT_SCAN_ENGINE_VERSION) {
        return false;
    }

    if (currentScan.authResultsFingerprint !== authResultsFingerprint) {
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
    providerMeta,
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
            senderListMatch: result.senderListMatch,
            scanSource,
            engineVersion: CURRENT_SCAN_ENGINE_VERSION,
            authResultsFingerprint: buildAuthResultsFingerprint(email.authResults),
            aiSignals,
            providerMeta,
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
        returnDocument: 'after',
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
            returnDocument: 'after',
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

// Decide ce explicație se salvează: textul AI când s-a generat corect, un fallback
// controlat când AI a fost cerut dar a eșuat, sau fallback-ul deja construit când AI
// era oprit. Așa aplicația nu rămâne niciodată fără explicație.
const resolveExplanationResult = ({
    shouldGenerateNaturalExplanation,
    explanationResult,
    finalResult,
    aiSignals,
}) => {
    const aiFailedAfterRequest =
        shouldGenerateNaturalExplanation &&
        explanationResult.meta.status !== 'generated';
    if (aiFailedAfterRequest) {
        return buildFallbackExplanationResult({
            verdict: finalResult.verdict,
            triggeredRules: finalResult.triggeredRules,
            aiSignals,
            senderVerifiedBrand: finalResult.senderVerifiedBrand,
            verifiedBrandName: finalResult.verifiedBrandName,
            senderListMatch: finalResult.senderListMatch,
            fallbackReason: explanationResult.meta.fallbackReason || 'ollama_failed',
        });
    }

    if (explanationResult.meta.status === 'generated') {
        return {
            explanation: explanationResult.explanation,
            meta: {
                ...explanationResult.meta,
                fallbackUsed: false,
                fallbackReason: null,
            },
        };
    }

    return explanationResult;
};

// Funcția principală: scanează UN email și salvează rezultatul. Pașii (vezi
// docs/EXPLICATIE_BACKEND.md §4.5): 1) ia emailul; 2) context liste user;
// 3) context brand; 4) input pentru AI; 5) reguli; 6) semnale AI; 7) scor final
// + verdict; 8) explicație; 9) salvare (un singur scan curent per email).
export const scanEmailWithRules = async ({
    userId,
    emailId,
    scanSource = 'manual', // de unde vine scanarea: 'manual' (buton) sau 'sync'
    skipIfCurrentEngineExists = false, // la sync: sări dacă scanul e deja la zi
}) => {
    const email = await findOwnedEmail({ emailId, userId }); // doar emailul userului
    // Context: e expeditorul pe lista de încredere/blocare a userului?
    const listContext = await getSenderListContextForEmail({
        userId,
        senderAddress: email.from,
        senderDomain: email.senderDomain,
    });
    // Context: vine emailul chiar de pe domeniul oficial al unui brand cunoscut?
    const brandContext = verifySenderBrand({
        senderDomain: email.senderDomain,
        authResults: email.authResults,
    });
    // Un expeditor blocat nu apare niciodată ca "brand verificat": blocarea userului
    // învinge, și niciun strat de reducere nu se aplică peste regula dură de blocare.
    const scanContext = listContext.senderBlocklisted
        ? { ...listContext, senderVerifiedBrand: false, brandName: null }
        : { ...brandContext, ...listContext };
    const aiInput = buildAiAnalysisInput(email, scanContext);
    const aiEnabled = await getUserAiEnabled(userId);
    const currentScan = await getCurrentScanForEmail({ userId, emailId: email._id });
    const authResultsFingerprint = buildAuthResultsFingerprint(email.authResults);

    if (
        skipIfCurrentEngineExists &&
        isCurrentScanValidForCurrentAiSetting({
            currentScan,
            aiEnabled,
            authResultsFingerprint,
        })
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

    const detectionContext = createDetectionContext({
        email,
        senderListContext: listContext,
        brandContext,
        authResults: email.authResults || {},
        scanContext,
        userSettings: { aiEnabled },
        aiInput,
        semanticAnalyzer: analyzeEmailSemanticsWithOllama,
    });
    const detectionResult = await runDetection(detectionContext);
    const aiSignals = detectionResult.aiSignals;
    const finalResult = {
        score: detectionResult.score,
        ruleScore: detectionResult.ruleScore,
        aiScore: detectionResult.aiScore,
        verdict: detectionResult.verdict,
        reasons: detectionResult.reasons,
        triggeredRules: detectionResult.triggeredRules,
        senderVerifiedBrand: Boolean(scanContext.senderVerifiedBrand),
        verifiedBrandName: scanContext.senderVerifiedBrand
            ? scanContext.brandName || null
            : null,
        senderListMatch: listContext.listMatch || null,
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
              senderListMatch: finalResult.senderListMatch,
              fallbackReason: 'ai_disabled',
          });
    const finalExplanationResult = resolveExplanationResult({
        shouldGenerateNaturalExplanation,
        explanationResult,
        finalResult,
        aiSignals,
    });

    const scan = await upsertCurrentScanForEmail({
        email,
        scanSource,
        result: finalResult,
        aiSignals,
        providerMeta: detectionResult.providerMeta,
        aiExplanation: finalExplanationResult.explanation,
        aiExplanationMeta: finalExplanationResult.meta,
    });

    return {
        status: 'scanned',
        scan: toPublicScan(scan),
        aiInput,
    };
};

// Rulează scanarea pentru toate emailurile aduse la o sincronizare. Emailurile
// noi se scanează mereu; cele actualizate doar dacă scanul nu e deja la zi; cele
// pe care userul le-a marcat manual sunt SĂRITE (nu-i suprascriem decizia).
// Întoarce un sumar cu numărători (câte scanate / sărite / eșuate).
export const runSyncScanPipeline = async ({
    userId,
    insertedEmailIds = [], // id-urile emailurilor nou-inserate
    updatedEmailIds = [], // id-urile emailurilor actualizate
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

    const scanConcurrency = getScanConcurrency();
    const insertedResults = await mapWithConcurrency(
        uniqueInsertedIds,
        scanConcurrency,
        async (emailId) => {
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
        },
    );

    const updatedResults = await mapWithConcurrency(
        uniqueUpdatedIds,
        scanConcurrency,
        async (emailId) => {
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
        },
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
