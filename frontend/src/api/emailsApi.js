// ─────────────────────────────────────────────────────────────────────────────
// emailsApi.js — apeluri pentru lista de emailuri, statistici și detalii.
//
// Ce face, pe scurt: citește emailurile sincronizate (cu filtre/paginare),
// statisticile pentru dashboard (sumar, evoluție în timp, expeditori riscanți)
// și detaliile unui email individual (inclusiv conținutul brut).
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Transformă un obiect de parametri (ex. { from, to, page: 2 }) într-un
// query string gata de pus în URL (ex. "?from=...&to=...&page=2").
// Ignoră valorile undefined, null sau string gol, ca să nu trimitem
// parametri inutili la backend.
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

// Returnează lista de emailuri, filtrată/paginată după `params`.
export const getEmails = (params) => apiClient.get(`/emails${toQueryString(params)}`);

// Returnează statistici agregate (ex. nr. emailuri pe verdict) pentru
// intervalul de timp din `params`. Folosit pe dashboard.
export const getEmailStats = (params) =>
  apiClient.get(`/emails/stats${toQueryString(params)}`);

// Returnează evoluția în timp a emailurilor (pentru graficul de tendințe).
export const getEmailTrend = (params) =>
  apiClient.get(`/emails/trend${toQueryString(params)}`);

// Returnează cei mai riscanți expeditori (folosit pe dashboard).
export const getTopRiskySenders = (params) =>
  apiClient.get(`/emails/top-risky-senders${toQueryString(params)}`);

// Returnează detaliile unui singur email (subiect, expeditor, verdict etc.).
export const getEmail = (emailId) => apiClient.get(`/emails/${emailId}`);

// Returnează conținutul brut (raw) al unui email, ex. pentru afișarea
// header-elor tehnice sau a sursei complete.
export const getEmailRaw = (emailId) => apiClient.get(`/emails/${emailId}/raw`);
