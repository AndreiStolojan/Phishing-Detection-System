import {
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT_MS,
} from '../config/env.js';

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = OLLAMA_MODEL || 'gemma3:4b'
const DEFAULT_OLLAMA_TIMEOUT_MS = 45000;
const MAX_EXPLANATION_TIMEOUT_MS = 120000;
const PROMPT_VERSION = 'explanation-v3';

const EMPTY_EXPLANATION = {
    summary: '',
};

const stripCodeFence = (value) =>
    value
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

const normalizeBaseUrl = (rawValue) => {
    const trimmedValue = String(rawValue || '').trim();

    if (!trimmedValue) {
        return DEFAULT_OLLAMA_BASE_URL;
    }

    if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
        return trimmedValue.replace(/\/+$/, '');
    }

    return `http://${trimmedValue.replace(/\/+$/, '')}`;
};

const buildCandidateBaseUrls = () => {
    const normalizedConfiguredBaseUrl = normalizeBaseUrl(
        OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL
    );
    const candidateUrls = [normalizedConfiguredBaseUrl];

    try {
        const parsedConfiguredUrl = new URL(normalizedConfiguredBaseUrl);

        if (parsedConfiguredUrl.hostname === 'localhost') {
            candidateUrls.push(
                normalizedConfiguredBaseUrl.replace('://localhost', '://127.0.0.1')
            );
        }

        if (parsedConfiguredUrl.hostname === '127.0.0.1') {
            candidateUrls.push(
                normalizedConfiguredBaseUrl.replace('://127.0.0.1', '://localhost')
            );
        }
    } catch {
        candidateUrls.push(DEFAULT_OLLAMA_BASE_URL);
    }

    if (!candidateUrls.includes(DEFAULT_OLLAMA_BASE_URL)) {
        candidateUrls.push(DEFAULT_OLLAMA_BASE_URL);
    }

    return [...new Set(candidateUrls)];
};

const buildBaseMeta = () => ({
    source: 'ollama',
    model: OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
    promptVersion: PROMPT_VERSION,
});

const clampTimeoutMs = () => {
    const parsedTimeoutMs = Number.parseInt(
        String(OLLAMA_TIMEOUT_MS || DEFAULT_OLLAMA_TIMEOUT_MS),
        10
    );

    if (!Number.isFinite(parsedTimeoutMs)) {
        return DEFAULT_OLLAMA_TIMEOUT_MS;
    }

    return Math.min(Math.max(parsedTimeoutMs, 5000), MAX_EXPLANATION_TIMEOUT_MS);
};

const normalizeScore = (value) => {
    const score = Number(value);

    if (!Number.isFinite(score)) {
        return 0;
    }

    return Math.min(Math.max(score, 0), 100);
};

const buildExplanationInput = ({
    verdict,
    score,
    ruleScore,
    aiScore,
    triggeredRules,
    aiSignals,
}) => ({
    verdict: String(verdict || '').trim(),
    score: normalizeScore(score),
    ruleScore: normalizeScore(ruleScore),
    aiScore: normalizeScore(aiScore),
    triggeredRules: Array.isArray(triggeredRules) ? triggeredRules : [],
    aiSignals: aiSignals && typeof aiSignals === 'object' ? aiSignals : {},
});

const buildExplanationSystemPrompt = () => `
You are a cybersecurity analyst who writes a very short phishing-scan explanation for
non-technical users.

Return ONLY valid JSON. No markdown. No text before or after JSON.
Write the summary in English.

Rules:
- Do not change the provided verdict.
- Do not change the provided scores.
- Do not invent reasons.
- Use only triggeredRules and aiSignals.
- Write 1 to 3 short sentences.
- First mention the main risk level or signal.
- End with a small practical recommendation.
- If the verdict is safe, recommend normal caution, not alarm.
- If the verdict is suspicious or likely_phishing, recommend not opening links or verifying the sender.

Required JSON:
{
  "summary": "string"
}
`.trim();

const buildExplanationUserPrompt = (explanationInput) => `
Create only the JSON summary from this scan data:
${JSON.stringify(explanationInput)}
`.trim();

const normalizeText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const validateExplanationOutput = (rawValue) => {
    const invalid = (reason) => ({ isValid: false, reason });
    const cleanedValue = stripCodeFence(String(rawValue || ''));
    const firstObjectIndex = cleanedValue.indexOf('{');
    const lastObjectIndex = cleanedValue.lastIndexOf('}');
    const jsonCandidate =
        firstObjectIndex >= 0 && lastObjectIndex > firstObjectIndex
            ? cleanedValue.slice(firstObjectIndex, lastObjectIndex + 1)
            : cleanedValue;
    let parsedValue;

    try {
        parsedValue = JSON.parse(jsonCandidate);
    } catch {
        return invalid('invalid_json');
    }

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        return invalid('invalid_shape');
    }

    const explanation = {
        summary: normalizeText(parsedValue.summary, 320),
    };

    if (!explanation.summary) {
        return invalid('missing_summary');
    }

    return {
        isValid: true,
        explanation,
    };
};

const buildFailedResult = ({ baseMeta, latencyMs, fallbackUsed, fallbackReason }) => {
    console.error('[ollama-explanation] Explanation generation failed', {
        fallbackReason,
        latencyMs,
        hostFallbackUsed: fallbackUsed,
    });

    return {
        explanation: EMPTY_EXPLANATION,
        meta: {
            status: 'failed',
            ...baseMeta,
            latencyMs,
            hostFallbackUsed: fallbackUsed,
            hostFallbackReason: fallbackUsed ? 'local_host_fallback' : null,
            fallbackReason,
            evaluatedAt: new Date(),
        },
    };
};

export const generateNaturalExplanationWithOllama = async ({
    verdict,
    score,
    ruleScore,
    aiScore,
    triggeredRules,
    aiSignals,
}) => {
    const baseMeta = buildBaseMeta();
    const ollamaTimeoutMs = clampTimeoutMs();
    const candidateBaseUrls = buildCandidateBaseUrls();
    const explanationInput = buildExplanationInput({
        verdict,
        score,
        ruleScore,
        aiScore,
        triggeredRules,
        aiSignals,
    });
    const requestBody = JSON.stringify({
        model: baseMeta.model,
        stream: false,
        format: 'json',
        options: {
            temperature: 0,
            num_predict: 80,
        },
        messages: [
            {
                role: 'system',
                content: buildExplanationSystemPrompt(),
            },
            {
                role: 'user',
                content: buildExplanationUserPrompt(explanationInput),
            },
        ],
    });

    let lastNetworkError = null;

    for (const [candidateIndex, candidateBaseUrl] of candidateBaseUrls.entries()) {
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ollamaTimeoutMs);
        const fallbackUsed = candidateIndex > 0;
        const fallbackReason = fallbackUsed ? 'local_host_fallback' : null;

        try {
            const response = await fetch(`${candidateBaseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: requestBody,
            });

            const payload = await response.json().catch(() => ({}));
            const latencyMs = Date.now() - startedAt;

            if (!response.ok) {
                return buildFailedResult({
                    baseMeta,
                    latencyMs,
                    fallbackUsed,
                    fallbackReason: payload.error || `ollama_http_${response.status}`,
                });
            }

            const validatedOutput = validateExplanationOutput(payload?.message?.content);

            if (!validatedOutput.isValid) {
                return buildFailedResult({
                    baseMeta,
                    latencyMs,
                    fallbackUsed,
                    fallbackReason: `ollama_invalid_output:${validatedOutput.reason}`,
                });
            }

            return {
                explanation: validatedOutput.explanation,
                meta: {
                    status: 'generated',
                    ...baseMeta,
                    latencyMs,
                    hostFallbackUsed: fallbackUsed,
                    hostFallbackReason: fallbackReason,
                    evaluatedAt: new Date(),
                },
            };
        } catch (error) {
            const latencyMs = Date.now() - startedAt;

            if (error.name === 'AbortError') {
                return buildFailedResult({
                    baseMeta,
                    latencyMs,
                    fallbackUsed,
                    fallbackReason: 'ollama_timeout',
                });
            }

            lastNetworkError = {
                latencyMs,
                fallbackUsed,
                fallbackReason: 'ollama_unreachable',
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    return buildFailedResult({
        baseMeta,
        latencyMs: lastNetworkError?.latencyMs || 0,
        fallbackUsed: lastNetworkError?.fallbackUsed || false,
        fallbackReason: lastNetworkError?.fallbackReason || 'ollama_unreachable',
    });
};
