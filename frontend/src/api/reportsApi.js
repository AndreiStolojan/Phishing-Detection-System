import { apiClient } from './apiClient.js';

export const getMonthlySummary = (month) =>
  apiClient.get(`/reports/monthly-summary${month ? `?month=${month}` : ''}`);

export const sendMonthlySummary = (month) =>
  apiClient.post(`/reports/monthly-summary/send${month ? `?month=${month}` : ''}`);
