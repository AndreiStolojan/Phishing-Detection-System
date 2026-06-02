import { apiClient } from './apiClient.js';

export const markEmailSafe = (emailId) =>
  apiClient.post(`/actions/emails/${emailId}/mark-safe`);

export const markEmailPhishing = (emailId) =>
  apiClient.post(`/actions/emails/${emailId}/mark-phishing`);
