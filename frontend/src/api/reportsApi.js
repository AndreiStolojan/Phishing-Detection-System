// ─────────────────────────────────────────────────────────────────────────────
// reportsApi.js — apeluri pentru raportul-rezumat trimis pe email.
//
// Ce face, pe scurt: citește un rezumat (sumar) al activității pentru un
// interval de timp și trimite acel rezumat pe email userului.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Transformă un obiect de parametri într-un query string (vezi explicația
// din emailsApi.js — aceeași logică, duplicată aici pentru simplitate).
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
  Rapoartele respectă filtrul global de interval de timp: se trimite
  { from, to, label }. `label` e doar pentru afișare — apare ca titlu în
  raportul trimis pe email (ex. "Yesterday" / "Ieri").
  Endpoint-ul își păstrează numele istoric ("monthly-summary") și suportul
  pentru ?month=YYYY-MM, gestionate pe partea de backend.
*/
// Returnează datele rezumatului pentru intervalul dat (afișat în UI).
export const getReportSummary = (params) =>
  apiClient.get(`/reports/monthly-summary${toQueryString(params)}`);

// Cere backend-ului să trimită rezumatul pe email userului curent.
export const sendReportSummary = (params) =>
  apiClient.post(`/reports/monthly-summary/send${toQueryString(params)}`);
