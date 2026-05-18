import apiClient from './apiClient.js';

const encodeId = (id) => encodeURIComponent(id);

export const getLatestScanForEmail = (emailId) => (
  apiClient.get(`/scans/emails/${encodeId(emailId)}/latest`)
);

export const rescanEmail = (emailId) => (
  apiClient.post(`/scans/emails/${encodeId(emailId)}`)
);

export default {
  getLatestScanForEmail,
  rescanEmail,
};
