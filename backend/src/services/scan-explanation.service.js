const verdictToSentence = {
    safe:
        'Verdictul curent indica un risc scazut pe baza regulilor active. Verifica totusi expeditorul inainte de a trimite date sensibile.',
    suspicious:
        'Verdictul curent indica un email suspect pe baza semnalelor detectate. Evita linkurile si verifica expeditorul printr-un canal sigur.',
    likely_phishing:
        'Verdictul curent indica o probabilitate ridicata de phishing pe baza semnalelor detectate. Nu accesa linkurile si nu trimite date sensibile.',
};

const ruleToPhrase = (ruleId) => {
    if (!ruleId) {
        return '';
    }

    if (ruleId === 'reply_to_mismatch') {
        return 'domeniul Reply-To nu corespunde cu domeniul expeditorului';
    }

    if (ruleId === 'shortened_url_detected') {
        return 'emailul contine linkuri scurtate';
    }

    if (ruleId.startsWith('suspicious_link_pattern:')) {
        return 'emailul contine pattern-uri de link suspecte';
    }

    if (ruleId === 'high_risk_attachment_extension') {
        return 'emailul contine atasamente cu extensii cu risc ridicat';
    }

    if (ruleId === 'archive_attachment_extension') {
        return 'emailul contine atasamente de tip arhiva';
    }

    if (ruleId === 'too_many_links_high' || ruleId === 'too_many_links_medium') {
        return 'emailul are un numar mare de linkuri';
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
        return `Regulile au semnalat ca ${phrases[0]}.`;
    }

    return `Regulile au semnalat ca ${phrases[0]} si ${phrases[1]}.`;
};

const buildAiSentence = (aiSignals) => {
    if (!aiSignals || aiSignals.status !== 'evaluated') {
        return '';
    }

    const fragments = [];

    if (['medium', 'high'].includes(aiSignals.urgencyLevel)) {
        fragments.push('textul foloseste presiune sau urgenta');
    }

    if (aiSignals.sensitiveDataRequest) {
        fragments.push('mesajul cere date sensibile');
    }

    if (aiSignals.loginOrActionRequest) {
        fragments.push('mesajul impinge utilizatorul spre login sau actiune rapida');
    }

    if (['medium', 'high'].includes(aiSignals.socialEngineeringLevel)) {
        fragments.push('exista indicii de social engineering');
    }

    if (aiSignals.brandImpersonationSuspected) {
        fragments.push('exista indicii de impersonare de brand');
    }

    if (fragments.length === 0) {
        return 'Analiza semantica AI nu a adaugat semnale de risc puternice.';
    }

    return `Analiza semantica AI indica faptul ca ${fragments.slice(0, 2).join(' si ')}.`;
};

export const buildControlledRomanianExplanation = ({
    verdict,
    triggeredRules,
    aiSignals,
}) => {
    const sentences = [];

    sentences.push(verdictToSentence[verdict] || verdictToSentence.safe);

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

export const buildControlledRomanianExplanationObject = ({
    verdict,
    triggeredRules,
    aiSignals,
}) => ({
    summary: buildControlledRomanianExplanation({ verdict, triggeredRules, aiSignals }),
});
