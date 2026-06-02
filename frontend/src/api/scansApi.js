import { apiClient } from './apiClient.js';

export const scanEmail = (emailId) => apiClient.post(`/scans/emails/${emailId}`);

export const getLatestScan = (emailId) => apiClient.get(`/scans/emails/${emailId}/latest`);
