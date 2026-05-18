import apiClient from './apiClient.js';

const normalizeEmailsQuery = (query = {}) => {
    const params = {
        page: query.page,
        limit: query.limit,
        q: query.q,
        verdict: query.verdict,
        mailAccountId: query.mailAccountId,
    };

    if (query.riskBucket && query.riskBucket !== 'all') {
        params.riskBucket = query.riskBucket;
    }

    return params;
};

export const getEmails = (query = {}) => (
    apiClient.get('/emails', {
        params: normalizeEmailsQuery(query),
    })
);

export default {
    getEmails,
};
