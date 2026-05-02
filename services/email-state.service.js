export const deriveEmailReviewState = ({ email, latestScan }) => {
    const userVerdict = email?.userVerdict || null;
    const scanVerdict = latestScan?.verdict || null;

    if (userVerdict === 'safe') {
        return {
            reviewStatus: 'reviewed',
            effectiveVerdict: 'safe',
            verdictSource: 'user',
            isQuarantined: false,
            riskBucket: 'reviewed_safe',
        };
    }

    if (userVerdict === 'phishing') {
        return {
            reviewStatus: 'reviewed',
            effectiveVerdict: 'phishing',
            verdictSource: 'user',
            isQuarantined: false,
            riskBucket: 'confirmed_phishing',
        };
    }

    if (scanVerdict === 'likely_phishing') {
        return {
            reviewStatus: 'pending_review',
            effectiveVerdict: 'likely_phishing',
            verdictSource: 'scan',
            isQuarantined: true,
            riskBucket: 'quarantine',
        };
    }

    if (scanVerdict === 'suspicious') {
        return {
            reviewStatus: 'pending_review',
            effectiveVerdict: 'suspicious',
            verdictSource: 'scan',
            isQuarantined: false,
            riskBucket: 'needs_review',
        };
    }

    if (scanVerdict === 'safe') {
        return {
            reviewStatus: 'no_review_needed',
            effectiveVerdict: 'safe',
            verdictSource: 'scan',
            isQuarantined: false,
            riskBucket: 'safe',
        };
    }

    return {
        reviewStatus: 'unscanned',
        effectiveVerdict: null,
        verdictSource: null,
        isQuarantined: false,
        riskBucket: 'unscanned',
    };
};

export const buildEmailStateForUser = async ({ email, latestScan }) => {
    const reviewState = deriveEmailReviewState({ email, latestScan });

    return {
        userVerdict: email.userVerdict || null,
        reviewedAt: email.reviewedAt || null,
        lastManualAction: email.lastManualAction || null,
        ...reviewState,
    };
};
