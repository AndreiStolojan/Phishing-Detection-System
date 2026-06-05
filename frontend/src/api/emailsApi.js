import { apiClient } from './apiClient.js';

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();

  return queryString ? `?${queryString}` : '';
};

export const getEmails = (params) => apiClient.get(`/emails${toQueryString(params)}`);

export const getEmailStats = () => apiClient.get('/emails/stats');

export const getEmail = (emailId) => apiClient.get(`/emails/${emailId}`);

export const getEmailRaw = (emailId) => apiClient.get(`/emails/${emailId}/raw`);
