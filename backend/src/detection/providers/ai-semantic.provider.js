// Local semantic evidence. The raw analyzer response is carried in result meta
// for persistence and explanation generation; emitted evidence stays point-free.

export const meta = Object.freeze({
    id: 'ai-semantic',
    version: 1,
    kind: 'ai',
    optional: true,
});

const buildAiDisabledSignals = () => ({
    status: 'disabled',
    provider: 'ollama',
    mode: 'local',
    latencyMs: 0,
    evaluatedAt: new Date(),
    disabledReason: 'ai_disabled',
});

export const collectAiSemanticSignals = (aiSignals) => {
    const signals = [];

    if (!aiSignals || aiSignals.status !== 'evaluated') {
        return signals;
    }

    if (aiSignals.urgencyLevel === 'high') {
        signals.push({
            key: 'urgency_high',
            rule: 'ai_semantic:urgency_high',
            reason: 'AI semantic: high urgency language detected.',
            details: 'AI flagged urgent pressure language as high.',
            order: 70,
        });
    } else if (aiSignals.urgencyLevel === 'medium') {
        signals.push({
            key: 'urgency_medium',
            rule: 'ai_semantic:urgency_medium',
            reason: 'AI semantic: medium urgency language detected.',
            details: 'AI flagged urgent pressure language as medium.',
            order: 70,
        });
    }

    if (aiSignals.sensitiveDataRequest) {
        signals.push({
            key: 'sensitive_data_request',
            rule: 'ai_semantic:sensitive_data_request',
            reason: 'AI semantic: request for sensitive data detected.',
            details: 'AI detected password/card/OTP style data request.',
            order: 71,
        });
    }

    if (aiSignals.loginOrActionRequest) {
        signals.push({
            key: 'login_or_action_request',
            rule: 'ai_semantic:login_or_action_request',
            reason: 'AI semantic: login or rapid action request detected.',
            details: 'AI detected push toward login or immediate user action.',
            order: 72,
        });
    }

    if (aiSignals.socialEngineeringLevel === 'high') {
        signals.push({
            key: 'social_engineering_high',
            rule: 'ai_semantic:social_engineering_high',
            reason: 'AI semantic: high social engineering pressure detected.',
            details: 'AI flagged social engineering patterns as high.',
            order: 73,
        });
    } else if (aiSignals.socialEngineeringLevel === 'medium') {
        signals.push({
            key: 'social_engineering_medium',
            rule: 'ai_semantic:social_engineering_medium',
            reason: 'AI semantic: medium social engineering pressure detected.',
            details: 'AI flagged social engineering patterns as medium.',
            order: 73,
        });
    }

    if (aiSignals.brandImpersonationSuspected) {
        signals.push({
            key: 'brand_impersonation_suspected',
            rule: 'ai_semantic:brand_impersonation_suspected',
            reason: 'AI semantic: possible brand impersonation detected.',
            details: 'AI found likely impersonation of known organization/brand.',
            order: 74,
        });
    }

    return signals;
};

export const collectSignals = collectAiSemanticSignals;
export const collectAiSignals = collectAiSemanticSignals;

export const analyze = async (ctx = {}) => {
    if (!ctx.userSettings?.aiEnabled) {
        return {
            status: 'skipped',
            signals: [],
            meta: {
                aiSignals: buildAiDisabledSignals(),
            },
        };
    }

    if (typeof ctx.semanticAnalyzer !== 'function') {
        throw new TypeError('AI provider requires ctx.semanticAnalyzer when AI is enabled.');
    }

    const aiSignals = await ctx.semanticAnalyzer({
        analysisInput: ctx.aiInput,
        enabled: true,
        brandContext: ctx.scanContext,
    });

    return {
        ...(aiSignals?.status === 'failed' ? { status: 'error' } : {}),
        signals: collectAiSemanticSignals(aiSignals),
        meta: {
            aiSignals,
        },
    };
};
