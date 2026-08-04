const DEFAULT_MAX_BYTES = 64 * 1024;
const ABSOLUTE_MAX_BYTES = 1024 * 1024;

const responseError = (message) => {
    const error = new Error(message);
    error.code = 'THREAT_INTEL_RESPONSE_INVALID';
    return error;
};

const contentLength = (headers) => {
    const value = typeof headers?.get === 'function'
        ? headers.get('content-length')
        : headers?.['content-length'] ?? headers?.['Content-Length'];
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const readBoundedJson = async (
    response,
    { maxBytes = DEFAULT_MAX_BYTES } = {}
) => {
    const limit = Math.min(
        Math.max(Number(maxBytes) || DEFAULT_MAX_BYTES, 1),
        ABSOLUTE_MAX_BYTES
    );
    const declaredLength = contentLength(response?.headers);
    if (declaredLength !== null && declaredLength > limit) {
        throw responseError('Threat intelligence response exceeds its size limit');
    }

    const reader = response?.body?.getReader?.();
    if (!reader) {
        throw responseError('Threat intelligence response has no bounded readable body');
    }

    const chunks = [];
    let byteLength = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) {
            await reader.cancel();
            throw responseError('Threat intelligence response body is invalid');
        }

        byteLength += value.byteLength;
        if (byteLength > limit) {
            await reader.cancel();
            throw responseError('Threat intelligence response exceeds its size limit');
        }
        chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    try {
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch (error) {
        throw responseError(`Threat intelligence response is not valid JSON: ${error.message}`);
    }
};
