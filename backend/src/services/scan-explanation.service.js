const verdictToSentence = {
    safe:
        'The current verdict shows a low risk based on the active checks. Still, verify the sender before sending any sensitive information.',
    suspicious:
        'The current verdict shows a suspicious email based on the detected signals. Avoid the links and verify the sender through a trusted channel.',
    likely_phishing:
        'The current verdict shows a high likelihood of phishing based on the detected signals. Do not open the links and do not send any sensitive information.',
};

const ruleToPhrase = (ruleId) => {
    if (!ruleId) {
        return '';
    }

    if (ruleId === 'reply_to_mismatch') {
        return 'the Reply-To address does not match the sender';
    }

    if (ruleId === 'shortened_url_detected') {
        return 'the email contains shortened links';
    }

    if (ruleId.startsWith('suspicious_link_pattern:')) {
        return 'the email contains suspicious link patterns';
    }

    if (ruleId === 'high_risk_attachment_extension') {
        return 'the email contains a high-risk attachment';
    }

    if (ruleId === 'archive_attachment_extension') {
        return 'the email contains a compressed archive attachment';
    }

    if (ruleId === 'too_many_links_high' || ruleId === 'too_many_links_medium') {
        return 'the email has an unusually high number of links';
    }

    return '';
};

const buildRuleSentence = (triggeredRules = []) => {
    const phrases = triggeredRules
        .map((ruleItem) => ruleToPhrase(ruleItem.rule))
        .filter(Boolean)
        .slice(0, 2);

    if (phrases.length === 0) {
        return '';
    }

    if (phrases.length === 1) {
        return `The security checks flagged that ${phrases[0]}.`;
    }

    return `The security checks flagged that ${phrases[0]} and ${phrases[1]}.`;
};

const buildAiSentence = (aiSignals) => {
    if (!aiSignals || aiSignals.status !== 'evaluated') {
        return '';
    }

    const fragments = [];

    if (['medium', 'high'].includes(aiSignals.urgencyLevel)) {
        fragments.push('the text uses pressure or urgency');
    }

    if (aiSignals.sensitiveDataRequest) {
        fragments.push('the message asks for sensitive information');
    }

    if (aiSignals.loginOrActionRequest) {
        fragments.push('the message pushes you to sign in or act quickly');
    }

    if (['medium', 'high'].includes(aiSignals.socialEngineeringLevel)) {
        fragments.push('there are signs of social engineering');
    }

    if (aiSignals.brandImpersonationSuspected) {
        fragments.push('there are signs of brand impersonation');
    }

    if (fragments.length === 0) {
        return 'The AI analysis did not add any strong risk signals.';
    }

    return `The AI analysis indicates that ${fragments.slice(0, 2).join(' and ')}.`;
};

const buildVerifiedBrandSentence = (senderVerifiedBrand, verifiedBrandName) => {
    if (!senderVerifiedBrand) {
        return '';
    }

    const brandLabel = verifiedBrandName ? ` of ${verifiedBrandName}` : '';

    return `This email comes from a verified official domain${brandLabel}, so brand-typical signals (urgency, links, sign-in prompts) were weighted down.`;
};

export const buildControlledExplanation = ({
    verdict,
    triggeredRules,
    aiSignals,
    senderVerifiedBrand = false,
    verifiedBrandName = null,
}) => {
    const sentences = [];

    sentences.push(verdictToSentence[verdict] || verdictToSentence.safe);

    const verifiedBrandSentence = buildVerifiedBrandSentence(
        senderVerifiedBrand,
        verifiedBrandName
    );
    if (verifiedBrandSentence) {
        sentences.push(verifiedBrandSentence);
    }

    const ruleSentence = buildRuleSentence(triggeredRules);
    if (ruleSentence) {
        sentences.push(ruleSentence);
    }

    const aiSentence = buildAiSentence(aiSignals);
    if (aiSentence) {
        sentences.push(aiSentence);
    }

    return sentences.join(' ').trim();
};

export const buildControlledExplanationObject = ({
    verdict,
    triggeredRules,
    aiSignals,
    senderVerifiedBrand = false,
    verifiedBrandName = null,
}) => ({
    summary: buildControlledExplanation({
        verdict,
        triggeredRules,
        aiSignals,
        senderVerifiedBrand,
        verifiedBrandName,
    }),
});
