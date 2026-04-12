const stripHtmlTags = (htmlValue) => htmlValue.replace(/<[^>]*>/g, ' ');

const normalizeWhitespace = (textValue) => textValue.replace(/\s+/g, ' ').trim();

const MAX_AI_SUBJECT_CHARS = 180;
const MAX_AI_HEADER_CHARS = 180;
const MAX_AI_BODY_CHARS = 1200;
const MAX_AI_LINKS = 6;
const MAX_AI_LINK_CHARS = 120;

const truncateText = (textValue, maxChars) =>
    textValue.length <= maxChars ? textValue : textValue.slice(0, maxChars);

export const buildAiAnalysisInput = (email) => {
    const textBody = normalizeWhitespace(email.textBody || '');
    const htmlFallback = normalizeWhitespace(stripHtmlTags(email.htmlBody || ''));
    const rawAnalysisBody = textBody || htmlFallback || email.snippet || '';
    const analysisBody = truncateText(rawAnalysisBody, MAX_AI_BODY_CHARS);
    const links = (email.links || [])
        .map((linkValue) => normalizeWhitespace(String(linkValue || '')))
        .filter(Boolean);
    const limitedLinks = links
        .slice(0, MAX_AI_LINKS)
        .map((linkValue) => truncateText(linkValue, MAX_AI_LINK_CHARS));

    return {
        subject: truncateText(email.subject || '', MAX_AI_SUBJECT_CHARS),
        from: truncateText(email.from || '', MAX_AI_HEADER_CHARS),
        replyTo: truncateText(email.replyTo || '', MAX_AI_HEADER_CHARS),
        body: analysisBody,
        links: limitedLinks,
        metadata: {
            senderDomain: email.senderDomain || '',
            replyToDomain: email.replyToDomain || '',
            linkCount: email.linkCount || 0,
            linksIncludedCount: limitedLinks.length,
            linksTruncated: links.length > limitedLinks.length,
            bodyTruncated: rawAnalysisBody.length > analysisBody.length,
            bodyCharsIncluded: analysisBody.length,
        },
    };
};
