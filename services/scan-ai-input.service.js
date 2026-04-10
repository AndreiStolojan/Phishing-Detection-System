const stripHtmlTags = (htmlValue) => htmlValue.replace(/<[^>]*>/g, ' ');

const normalizeWhitespace = (textValue) => textValue.replace(/\s+/g, ' ').trim();

export const buildAiAnalysisInput = (email) => {
    const textBody = normalizeWhitespace(email.textBody || '');
    const htmlFallback = normalizeWhitespace(stripHtmlTags(email.htmlBody || ''));
    const analysisBody = textBody || htmlFallback || email.snippet || '';

    return {
        subject: email.subject || '',
        from: email.from || '',
        replyTo: email.replyTo || '',
        body: analysisBody,
        links: email.links || [],
        metadata: {
            senderDomain: email.senderDomain || '',
            replyToDomain: email.replyToDomain || '',
            linkCount: email.linkCount || 0,
        },
    };
};
