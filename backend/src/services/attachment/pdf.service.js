const PDF_HEADER = Buffer.from('%PDF-');
const DEFAULT_MAX_PDF_SCAN_BYTES = 1024 * 1024;
const MAX_PDF_SCAN_BYTES = 10 * 1024 * 1024;

const ACTIVE_CONTENT_TOKENS = Object.freeze({
    hasAdditionalActions: Buffer.from('/AA'),
    hasEmbeddedFile: Buffer.from('/EmbeddedFile'),
    hasJavaScript: Buffer.from('/JavaScript'),
    hasJs: Buffer.from('/JS'),
    hasLaunch: Buffer.from('/Launch'),
    hasOpenAction: Buffer.from('/OpenAction'),
    hasUri: Buffer.from('/URI'),
});

const getScanLimit = (value) => {
    const parsed = Number.parseInt(String(value), 10);

    if (!Number.isFinite(parsed)) return DEFAULT_MAX_PDF_SCAN_BYTES;
    return Math.min(Math.max(parsed, 1), MAX_PDF_SCAN_BYTES);
};

const emptyPdfAnalysis = (status, extra = {}) => ({
    status,
    inspectedBytes: 0,
    truncated: false,
    hasAdditionalActions: false,
    hasEmbeddedFile: false,
    hasJavaScript: false,
    hasJs: false,
    hasLaunch: false,
    hasOpenAction: false,
    hasUri: false,
    hasOpenActionJavaScript: false,
    ...extra,
});

// Scans bounded raw PDF bytes for structural names. It does not render or parse
// a PDF object graph, and the returned metadata never includes byte content.
export const analyzePdfActiveContent = (buffer, { maxBytes } = {}) => {
    if (!Buffer.isBuffer(buffer)) return emptyPdfAnalysis('invalid_input');
    if (buffer.length < PDF_HEADER.length || !buffer.subarray(0, PDF_HEADER.length).equals(PDF_HEADER)) {
        return emptyPdfAnalysis('not_pdf');
    }

    const scanLimit = getScanLimit(maxBytes);
    const sample = buffer.subarray(0, scanLimit);
    const findings = Object.fromEntries(
        Object.entries(ACTIVE_CONTENT_TOKENS).map(([key, token]) => [
            key,
            sample.indexOf(token) !== -1,
        ])
    );

    return emptyPdfAnalysis('analyzed', {
        inspectedBytes: sample.length,
        truncated: buffer.length > sample.length,
        ...findings,
        hasOpenActionJavaScript:
            findings.hasOpenAction && (findings.hasJavaScript || findings.hasJs),
    });
};
