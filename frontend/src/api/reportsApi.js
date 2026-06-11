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

/*
  Reports follow the global time-range filter: pass { from, to, label }.
  `label` is display-only — it titles the emailed report (e.g. "Yesterday").
  The endpoint keeps its legacy name and ?month=YYYY-MM support backend-side.
*/
export const getReportSummary = (params) =>
  apiClient.get(`/reports/monthly-summary${toQueryString(params)}`);

export const sendReportSummary = (params) =>
  apiClient.post(`/reports/monthly-summary/send${toQueryString(params)}`);
