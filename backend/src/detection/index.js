// ─────────────────────────────────────────────────────────────────────────────
// index.js — punctul unic de intrare în motorul modular de detecție.
//
// Rulează providerii, apoi aplică scorarea centralizată. Detalii:
// docs/EXPLICATIE_BACKEND.md §4.
// ─────────────────────────────────────────────────────────────────────────────

import { runProviders } from './registry.js';
import { scoreSignals } from './scorer.js';

const buildAiProviderFailure = (providerMeta) => {
    const aiMeta = providerMeta.find(({ provider }) => provider === 'ai-semantic');

    return {
        status: 'failed',
        provider: 'ollama',
        mode: 'local',
        latencyMs: 0,
        evaluatedAt: new Date(),
        fallbackReason:
            aiMeta?.status === 'error'
                ? 'detection_provider_error'
                : 'ai_signal_unavailable',
    };
};

export const runDetection = async (ctx, options = {}) => {
    const providerRun = await runProviders(ctx, options);
    const scored = scoreSignals(providerRun.signals, ctx.scanContext);
    const aiResult = providerRun.providerResults.get('ai-semantic');
    const aiSignals =
        aiResult?.meta?.aiSignals ||
        buildAiProviderFailure(providerRun.providerMeta);

    return {
        ...scored,
        signals: providerRun.signals,
        providerMeta: providerRun.providerMeta,
        aiSignals,
    };
};
