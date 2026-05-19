import apiClient from './apiClient.js';

export const getMailAccounts = () => apiClient.get('/mail-accounts');

export const startGoogleMailAccountConnection = () => (
    apiClient.get('/mail-accounts/google/start')
);

export const syncMailAccount = (mailAccountId) => (
    apiClient.post(`/mail-accounts/${encodeURIComponent(mailAccountId)}/sync`)
);

export const updateMailAccountSettings = (mailAccountId, { syncMaxResults }) => (
    apiClient.patch(`/mail-accounts/${encodeURIComponent(mailAccountId)}/settings`, {
        syncMaxResults,
    })
);

export const deleteMailAccount = (mailAccountId) => (
    apiClient.del(`/mail-accounts/${encodeURIComponent(mailAccountId)}`)
);

export const disconnectMailAccount = deleteMailAccount;

export default {
    getMailAccounts,
    startGoogleMailAccountConnection,
    syncMailAccount,
    updateMailAccountSettings,
    deleteMailAccount,
    disconnectMailAccount,
};
