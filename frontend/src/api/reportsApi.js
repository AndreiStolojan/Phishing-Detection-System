import apiClient from './apiClient.js';

export const getMonthlySummary = ({ month } = {}) => (
    apiClient.get('/reports/monthly-summary', {
        params: {
            month,
        },
    })
);

export const sendMonthlySummaryDigest = ({ month } = {}) => (
    apiClient.post('/reports/monthly-summary/send', undefined, {
        params: {
            month,
        },
    })
);

export default {
    getMonthlySummary,
    sendMonthlySummaryDigest,
};
