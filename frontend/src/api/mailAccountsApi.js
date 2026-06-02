import { apiClient } from './apiClient.js';

export const getMailAccounts = () => apiClient.get('/mail-accounts');

export const getGoogleConnectUrl = () => apiClient.get('/mail-accounts/google/start');

export const syncMailAccount = (mailAccountId) =>
  apiClient.post(`/mail-accounts/${mailAccountId}/sync`);

export const updateMailAccountSettings = (mailAccountId, syncMaxResults) =>
  apiClient.patch(`/mail-accounts/${mailAccountId}/settings`, { syncMaxResults });

export const disconnectMailAccount = (mailAccountId) =>
  apiClient.del(`/mail-accounts/${mailAccountId}`);
