// Attachment-extension evidence. Matching intentionally remains case-sensitive
// and preserves duplicate extensions to match the legacy scanner.

export const meta = Object.freeze({
    id: 'attachment-extension',
    version: 1,
    kind: 'rule',
    optional: false,
});

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

export const collectAttachmentExtensionSignals = (ctx = {}) => {
    const attachmentExtensions = ctx.email?.attachmentExtensions || [];
    const highRiskAttachments = attachmentExtensions.filter((extension) =>
        HIGH_RISK_ATTACHMENT_EXTENSIONS.has(extension)
    );
    const archiveAttachments = attachmentExtensions.filter((extension) =>
        ARCHIVE_ATTACHMENT_EXTENSIONS.has(extension)
    );

    if (highRiskAttachments.length > 0) {
        return [
            {
                key: 'high_risk_attachment_extension',
                rule: 'high_risk_attachment_extension',
                reason: 'Email contains high-risk attachment extensions.',
                details: `Found high-risk attachment extensions: ${highRiskAttachments.join(', ')}.`,
                order: 50,
            },
        ];
    }

    if (archiveAttachments.length > 0) {
        return [
            {
                key: 'archive_attachment_extension',
                rule: 'archive_attachment_extension',
                reason: 'Email contains archive attachments.',
                details: `Found archive attachment extensions: ${archiveAttachments.join(', ')}.`,
                order: 50,
            },
        ];
    }

    return [];
};

export const collectSignals = collectAttachmentExtensionSignals;
export const collectAttachmentSignals = collectAttachmentExtensionSignals;

export const analyze = async (ctx) => ({
    signals: collectAttachmentExtensionSignals(ctx),
});
