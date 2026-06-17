// ─────────────────────────────────────────────────────────────────────────────
// mailAccountsApi.js — apeluri pentru conturile Gmail conectate.
//
// Ce face, pe scurt: leagă/dezleagă un cont Gmail (OAuth Google), pornește
// sincronizări manuale și schimbă setările de sincronizare ale unui cont.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Returnează lista conturilor Gmail conectate ale userului curent.
export const getMailAccounts = () => apiClient.get('/mail-accounts');

// Cere de la backend URL-ul de pornire al fluxului OAuth Google (userul e
// redirecționat acolo pentru a-și conecta contul Gmail).
export const getGoogleConnectUrl = () => apiClient.get('/mail-accounts/google/start');

// Declanșează manual o sincronizare (descărcare de emailuri noi) pentru
// contul cu id-ul `mailAccountId`.
export const syncMailAccount = (mailAccountId) =>
  apiClient.post(`/mail-accounts/${mailAccountId}/sync`);

// Schimbă numărul maxim de emailuri aduse la o sincronizare (syncMaxResults)
// pentru contul respectiv.
export const updateMailAccountSettings = (mailAccountId, syncMaxResults) =>
  apiClient.patch(`/mail-accounts/${mailAccountId}/settings`, { syncMaxResults });

// Deconectează (șterge) un cont Gmail din aplicație.
export const disconnectMailAccount = (mailAccountId) =>
  apiClient.del(`/mail-accounts/${mailAccountId}`);
