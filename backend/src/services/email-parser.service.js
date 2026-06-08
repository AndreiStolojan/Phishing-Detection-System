import { analyzeEmailLinks } from './link-analysis.service.js';

const decodeBase64Url = (encodedValue) => {
    if (!encodedValue) {
        return '';
    }

    const normalizedValue = encodedValue.replace(/-/g, '+').replace(/_/g, '/');
    const paddedValue = normalizedValue.padEnd(Math.ceil(normalizedValue.length / 4) * 4, '=');

    try {
        return Buffer.from(paddedValue, 'base64').toString('utf8');
    } catch {
        return '';
    }
};

const getHeaderValue = (headers, headerName) => {
    const normalizedHeaderName = headerName.toLowerCase();
    const matchedHeader = headers.find((header) => header.name?.toLowerCase() === normalizedHeaderName);

    return matchedHeader?.value?.trim() || '';
};

const parseEmailAddress = (addressValue) => {
    if (!addressValue) {
        return {
            email: '',
            domain: '',
            displayName: '',
        };
    }

    const match = addressValue.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
    const email = (match ? match[2] : addressValue).trim().toLowerCase();
    const displayName = (match ? match[1] : '').trim().replace(/^"|"$/g, '');
    const domain = email.includes('@') ? email.split('@').pop().toLowerCase() : '';

    return {
        email,
        domain,
        displayName,
    };
};

const extractAttachmentExtensions = (payload) => {
    const extensions = [];
    const queue = payload ? [payload] : [];

    while (queue.length > 0) {
        const currentPart = queue.shift();

        if (!currentPart) {
            continue;
        }

        if (Array.isArray(currentPart.parts) && currentPart.parts.length > 0) {
            queue.push(...currentPart.parts);
        }

        if (!currentPart.filename) {
            continue;
        }

        const filenameParts = currentPart.filename.split('.');
        const extension = filenameParts.length > 1 ? filenameParts.pop().toLowerCase() : '';

        if (extension) {
            extensions.push(extension);
        }
    }

    return [...new Set(extensions)];
};

const collectBodiesFromPayload = (payload) => {
    let textBody = '';
    let htmlBody = '';
    const queue = payload ? [payload] : [];

    while (queue.length > 0) {
        const currentPart = queue.shift();

        if (!currentPart) {
            continue;
        }

        if (Array.isArray(currentPart.parts) && currentPart.parts.length > 0) {
            queue.push(...currentPart.parts);
        }

        const mimeType = currentPart.mimeType || '';
        const bodyData = currentPart.body?.data ? decodeBase64Url(currentPart.body.data) : '';

        if (!bodyData) {
            continue;
        }

        if (mimeType === 'text/plain') {
            textBody = `${textBody}\n${bodyData}`.trim();
        }

        if (mimeType === 'text/html') {
            htmlBody = `${htmlBody}\n${bodyData}`.trim();
        }
    }

    return {
        textBody,
        htmlBody,
    };
};

const getReceivedAtDate = (gmailMessage, headers) => {
    const internalDateValue = Number(gmailMessage.internalDate);

    if (Number.isFinite(internalDateValue)) {
        return new Date(internalDateValue);
    }

    const dateHeaderValue = getHeaderValue(headers, 'Date');
    const dateFromHeader = dateHeaderValue ? new Date(dateHeaderValue) : null;

    if (dateFromHeader && !Number.isNaN(dateFromHeader.getTime())) {
        return dateFromHeader;
    }

    return new Date();
};

export const parseGmailMessageToEmailPayload = ({ gmailMessage, mailAccount, syncSource }) => {
    const payload = gmailMessage.payload || {};
    const headers = payload.headers || [];
    const fromHeader = getHeaderValue(headers, 'From');
    const toHeader = getHeaderValue(headers, 'To');
    const replyToHeader = getHeaderValue(headers, 'Reply-To');
    const subject = getHeaderValue(headers, 'Subject');
    const { email: fromEmail, domain: senderDomain, displayName } = parseEmailAddress(fromHeader);
    const { email: replyToEmail, domain: replyToDomain } = parseEmailAddress(replyToHeader);
    const { textBody, htmlBody } = collectBodiesFromPayload(payload);
    const attachmentExtensions = extractAttachmentExtensions(payload);
    const linkAnalysis = analyzeEmailLinks({ textBody, htmlBody });

    return {
        userId: mailAccount.userId,
        mailAccountId: mailAccount._id,
        provider: 'gmail',
        providerMessageId: gmailMessage.id,
        threadId: gmailMessage.threadId || null,
        subject,
        from: fromHeader || fromEmail,
        to: toHeader,
        replyTo: replyToEmail,
        displayName,
        senderDomain,
        replyToDomain,
        snippet: gmailMessage.snippet || '',
        textBody,
        htmlBody,
        links: linkAnalysis.links,
        linkDomains: linkAnalysis.linkDomains,
        linkCount: linkAnalysis.linkCount,
        hasShortenedUrl: linkAnalysis.hasShortenedUrl,
        suspiciousLinkPatterns: linkAnalysis.suspiciousLinkPatterns,
        attachmentExtensions,
        receivedAt: getReceivedAtDate(gmailMessage, headers),
        syncSource,
        rawHeaders: headers.map(h => ({ name: h.name || '', value: h.value || '' })),
    };
};
