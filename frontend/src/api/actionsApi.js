import apiClient from './apiClient.js';

const encodeId = (id) => encodeURIComponent(id);

export const markEmailSafe = (emailId) => (
  apiClient.post(`/actions/emails/${encodeId(emailId)}/mark-safe`)
);

export const markEmailPhishing = (emailId) => (
  apiClient.post(`/actions/emails/${encodeId(emailId)}/mark-phishing`)
);

export default {
  markEmailSafe,
  markEmailPhishing,
};
