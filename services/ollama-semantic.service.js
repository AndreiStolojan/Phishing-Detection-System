import {
    AI_SEMANTIC_ENABLED,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_PROMPT_VERSION,
    OLLAMA_TIMEOUT_MS,
} from '../config/env.js';

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma3:4b';
const DEFAULT_OLLAMA_TIMEOUT_MS = 45000;
const DEFAULT_PROMPT_VERSION = 'semantic-v1';

const normalizeBoolean = (value, defaultValue = false) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['1', 'true', 'yes', 'on'].includes(normalized)) {
            return true;
        }

        if (['0', 'false', 'no', 'off'].includes(normalized)) {
            return false;
        }
    }

    return defaultValue;
};

const normalizeLevel = (value) => {
    const validLevels = ['none', 'low', 'medium', 'high'];

    if (typeof value !== 'string') {
        return 'none';
    }

    const normalized = value.trim().toLowerCase();

    if (!validLevels.includes(normalized)) {
        return 'none';
    }

    return normalized;
};

const stripCodeFence = (value) =>
    value
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

const buildBaseMeta = () => ({
    provider: 'ollama',
    mode: 'local',
    model: OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
    promptVersion: OLLAMA_PROMPT_VERSION || DEFAULT_PROMPT_VERSION,
});

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

const buildSemanticSystemPrompt = () => `
You are an email security semantic signal extractor.

Return STRICT JSON only. Do not return markdown.
Do not provide a final phishing verdict.
Your job is only to extract semantic risk signals from the provided email content.

Rules:
- Be conservative. If unclear, choose safer default values.
- urgencyLevel must be one of: none, low, medium, high.
- socialEngineeringLevel must be one of: none, low, medium, high.
- sensitiveDataRequest, loginOrActionRequest, brandImpersonationSuspected must be booleans.
- language should be a short language code when possible (example: ro, en, fr).
- summary must be short (max 20 words), factual, and in Romanian.
`.trim();

const buildSemanticUserPrompt = (analysisInput) => `
Analyze this email content and extract semantic signals as JSON.

Email data:
${JSON.stringify(analysisInput)}
`.trim();

const parseSemanticOutput = (rawValue) => {
    const cleanedValue = stripCodeFence(String(rawValue || ''));

    const normalizeParsedValue = (parsedValue) => ({
        language: String(parsedValue.language || '').trim().toLowerCase().slice(0, 12),
        urgencyLevel: normalizeLevel(parsedValue.urgencyLevel),
        sensitiveDataRequest: normalizeBoolean(parsedValue.sensitiveDataRequest, false),
        loginOrActionRequest: normalizeBoolean(parsedValue.loginOrActionRequest, false),
        socialEngineeringLevel: normalizeLevel(parsedValue.socialEngineeringLevel),
        brandImpersonationSuspected: normalizeBoolean(
            parsedValue.brandImpersonationSuspected,
            false
        ),
        summary: String(parsedValue.summary || '').trim().slice(0, 240),
    });

    const buildNeutralFallback = (reason) =>
        normalizeParsedValue({
            language: '',
            urgencyLevel: 'none',
            sensitiveDataRequest: false,
            loginOrActionRequest: false,
            socialEngineeringLevel: 'none',
            brandImpersonationSuspected: false,
            summary: '',
            parserFallback: true,
            parserFallbackReason: reason,
            rawPreview: String(cleanedValue || '').slice(0, 220),
        });

    const parseBooleanField = (fieldName) => {
        const match = cleanedValue.match(
            new RegExp(`"${fieldName}"\\s*:\\s*(true|false)`, 'i')
        );

        if (!match) {
            return false;
        }

        return match[1].toLowerCase() === 'true';
    };

    const parseStringField = (fieldName, fallbackValue = '') => {
        const match = cleanedValue.match(
            new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i')
        );

        if (!match) {
            return fallbackValue;
        }

        return match[1];
    };

    try {
        return normalizeParsedValue(JSON.parse(cleanedValue));
    } catch {
        const partialResult = {
            language: parseStringField('language', ''),
            urgencyLevel: parseStringField('urgencyLevel', 'none'),
            sensitiveDataRequest: parseBooleanField('sensitiveDataRequest'),
            loginOrActionRequest: parseBooleanField('loginOrActionRequest'),
            socialEngineeringLevel: parseStringField('socialEngineeringLevel', 'none'),
            brandImpersonationSuspected: parseBooleanField('brandImpersonationSuspected'),
            summary: parseStringField('summary', ''),
        };

        const hasAnySignal =
            Boolean(partialResult.language) ||
            partialResult.sensitiveDataRequest ||
            partialResult.loginOrActionRequest ||
            partialResult.brandImpersonationSuspected ||
            partialResult.urgencyLevel !== 'none' ||
            partialResult.socialEngineeringLevel !== 'none';

        if (!hasAnySignal) {
            return {
                ...buildNeutralFallback('invalid_semantic_output'),
                parserFallback: true,
                parserFallbackReason: 'invalid_semantic_output',
                rawPreview: String(cleanedValue || '').slice(0, 220),
            };
        }

        return {
            ...normalizeParsedValue(partialResult),
            parserFallback: true,
            parserFallbackReason: 'partial_semantic_extraction',
            rawPreview: String(cleanedValue || '').slice(0, 220),
        };
    }
};

export const analyzeEmailSemanticsWithOllama = async ({ analysisInput }) => {
    const now = new Date();
    const baseMeta = buildBaseMeta();
    const aiEnabled = normalizeBoolean(AI_SEMANTIC_ENABLED, false);

    if (!aiEnabled) {
        return {
            status: 'disabled',
            ...baseMeta,
            latencyMs: 0,
            evaluatedAt: now,
        };
    }

    const candidateBaseUrls = buildCandidateBaseUrls();
    const parsedTimeoutMs = Number.parseInt(
        String(OLLAMA_TIMEOUT_MS || DEFAULT_OLLAMA_TIMEOUT_MS),
        10
    );
    const ollamaTimeoutMs = Number.isFinite(parsedTimeoutMs)
        ? Math.min(Math.max(parsedTimeoutMs, 5000), 120000)
        : DEFAULT_OLLAMA_TIMEOUT_MS;
    const requestBody = JSON.stringify({
        model: baseMeta.model,
        stream: false,
                format: 'json',
                options: {
                    temperature: 0,
                    num_predict: 120,
                },
        messages: [
            {
                role: 'system',
                content: buildSemanticSystemPrompt(),
            },
            {
                role: 'user',
                content: buildSemanticUserPrompt(analysisInput),
            },
        ],
    });

    let lastNetworkError = null;

    for (const candidateBaseUrl of candidateBaseUrls) {
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ollamaTimeoutMs);

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
                return {
                    status: 'failed',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    error:
                        payload.error ||
                        `ollama_http_${response.status}`,
                    endpoint: `${candidateBaseUrl}/api/chat`,
                };
            }

            try {
                const semanticSignals = parseSemanticOutput(payload?.message?.content);

                return {
                    status: 'evaluated',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    endpoint: `${candidateBaseUrl}/api/chat`,
                    ...semanticSignals,
                };
            } catch (parsingError) {
                return {
                    status: 'evaluated',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    endpoint: `${candidateBaseUrl}/api/chat`,
                    language: '',
                    urgencyLevel: 'none',
                    sensitiveDataRequest: false,
                    loginOrActionRequest: false,
                    socialEngineeringLevel: 'none',
                    brandImpersonationSuspected: false,
                    summary: '',
                    parserFallback: true,
                    parserFallbackReason: 'parser_exception',
                    error: 'ollama_invalid_output',
                    errorDetail: String(parsingError?.message || 'invalid semantic output'),
                };
            }
        } catch (error) {
            const latencyMs = Date.now() - startedAt;

            if (error.name === 'AbortError') {
                return {
                    status: 'failed',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    error: 'ollama_timeout',
                    endpoint: `${candidateBaseUrl}/api/chat`,
                };
            }

            lastNetworkError = {
                status: 'failed',
                ...baseMeta,
                latencyMs,
                evaluatedAt: new Date(),
                error: 'ollama_unreachable',
                errorDetail: String(error?.message || 'network_error'),
                endpoint: `${candidateBaseUrl}/api/chat`,
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    return (
        lastNetworkError || {
            status: 'failed',
            ...baseMeta,
            latencyMs: 0,
            evaluatedAt: new Date(),
            error: 'ollama_unreachable',
            endpoint: `${DEFAULT_OLLAMA_BASE_URL}/api/chat`,
        }
    );
};
