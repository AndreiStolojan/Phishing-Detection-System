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
// Bumped v2 -> v3: the prompt now receives the sender domain and a brand-verification
// context, and uses a dedicated variant for verified-brand senders.
const DEFAULT_PROMPT_VERSION = 'semantic-v3';

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

// The strict JSON contract is identical for both prompt variants, so the downstream
// parser is unchanged whether or not the sender is a verified brand.
const SEMANTIC_JSON_CONTRACT = `
Return STRICT JSON only — no markdown, no text before or after the JSON.
Use exactly these keys:
{
  "language": "<short code like en, ro, fr>",
  "urgencyLevel": "none|low|medium|high",
  "sensitiveDataRequest": true|false,
  "loginOrActionRequest": true|false,
  "socialEngineeringLevel": "none|low|medium|high",
  "brandImpersonationSuspected": true|false,
  "summary": "<max 20 words, factual, in English>"
}

Be conservative: when a signal is unclear, choose the safer (lower or false) value.`;

const buildSemanticSystemPrompt = (brandContext = {}) => {
    if (brandContext.senderVerifiedBrand && brandContext.brandName) {
        const officialDomainsText = (brandContext.officialDomains || []).join(', ');

        return `
You are a cybersecurity analyst specializing in phishing detection.
Your only task is to extract semantic risk signals from one email. You do NOT give a
final verdict or a score — a separate rule engine combines your signals with other checks.

This email's sender domain (${brandContext.senderDomain || 'unknown'}) has been verified as an
OFFICIAL domain of ${brandContext.brandName}${officialDomainsText ? ` (official domains: ${officialDomainsText})` : ''}.
This is a legitimate sender, NOT an impersonation. Always set "brandImpersonationSuspected" to false.

Because the sender is legitimate, focus your analysis on whether the email still contains
OTHER phishing indicators despite the trusted sender:
- links that point to domains OTHER than ${brandContext.brandName}'s official domains;
- requests for passwords, OTP codes, card numbers, or other sensitive data;
- pressure to sign in or act immediately;
- content inconsistent with the kind of email this brand normally sends.
${SEMANTIC_JSON_CONTRACT}
`.trim();
    }

    return `
You are a cybersecurity analyst specializing in phishing detection.
Your only task is to extract semantic risk signals from one email. You do NOT give a
final verdict or a score — a separate rule engine combines your signals with other checks.

Phishing emails typically impersonate a known brand or authority, create urgency or fear,
request credentials or sensitive data (passwords, OTP codes, card numbers), or pressure the
reader to click a link or sign in quickly. The email's real sender domain is provided in the
data as "senderDomain"; use it to judge whether any brand the email claims to be matches the
actual sender, and set "brandImpersonationSuspected" accordingly.
${SEMANTIC_JSON_CONTRACT}
`.trim();
};

const buildSemanticUserPrompt = (analysisInput) => `
Extract the semantic signals for this email as JSON using the required keys.

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

export const analyzeEmailSemanticsWithOllama = async ({
    analysisInput,
    enabled,
    brandContext = {},
    disabledReason = 'env_disabled',
} = {}) => {
    const now = new Date();
    const baseMeta = buildBaseMeta();
    const aiEnabled =
        typeof enabled === 'boolean'
            ? enabled
            : normalizeBoolean(AI_SEMANTIC_ENABLED, false);

    if (!aiEnabled) {
        return {
            status: 'disabled',
            ...baseMeta,
            latencyMs: 0,
            evaluatedAt: now,
            disabledReason,
        };
    }

    const candidateBaseUrls = buildCandidateBaseUrls();
    const parsedTimeoutMs = Number.parseInt(
        String(OLLAMA_TIMEOUT_MS || DEFAULT_OLLAMA_TIMEOUT_MS),
        10
    );
    const ollamaTimeoutMs = Number.isFinite(parsedTimeoutMs)
        ? Math.min(Math.max(parsedTimeoutMs, 5000), 600000)
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
                content: buildSemanticSystemPrompt(brandContext),
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
                const error = payload.error || `ollama_http_${response.status}`;
                console.error('[ollama-semantic] HTTP error from Ollama', {
                    endpoint: `${candidateBaseUrl}/api/chat`,
                    httpStatus: response.status,
                    error,
                    latencyMs,
                });
                return {
                    status: 'failed',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    error,
                    endpoint: `${candidateBaseUrl}/api/chat`,
                };
            }

            const semanticSignals = parseSemanticOutput(payload?.message?.content);

            // Unparseable output: treat as a failure rather than silently using neutral
            // defaults, so the UI can tell the user AI analysis did not complete.
            if (semanticSignals.parserFallbackReason === 'invalid_semantic_output') {
                console.error('[ollama-semantic] Unparseable model output', {
                    endpoint: `${candidateBaseUrl}/api/chat`,
                    rawPreview: semanticSignals.rawPreview,
                    latencyMs,
                });
                return {
                    status: 'failed',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    error: 'ollama_invalid_output',
                    endpoint: `${candidateBaseUrl}/api/chat`,
                };
            }

            return {
                status: 'evaluated',
                ...baseMeta,
                latencyMs,
                evaluatedAt: new Date(),
                endpoint: `${candidateBaseUrl}/api/chat`,
                ...semanticSignals,
            };
        } catch (error) {
            const latencyMs = Date.now() - startedAt;

            if (error.name === 'AbortError') {
                console.error('[ollama-semantic] Request timed out', {
                    endpoint: `${candidateBaseUrl}/api/chat`,
                    timeoutMs: ollamaTimeoutMs,
                    latencyMs,
                });
                return {
                    status: 'failed',
                    ...baseMeta,
                    latencyMs,
                    evaluatedAt: new Date(),
                    error: 'ollama_timeout',
                    endpoint: `${candidateBaseUrl}/api/chat`,
                };
            }

            console.error('[ollama-semantic] Ollama unreachable', {
                endpoint: `${candidateBaseUrl}/api/chat`,
                errorDetail: String(error?.message || 'network_error'),
                latencyMs,
            });
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
