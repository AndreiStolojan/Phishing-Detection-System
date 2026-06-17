// ─────────────────────────────────────────────────────────────────────────────
// actionsApi.js — acțiunile userului asupra unui email (revizuire manuală).
//
// Ce face, pe scurt: marchează un email ca "safe" (sigur) sau "phishing"
// pe baza deciziei userului, suprascriind verdictul automat al scanării.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Marchează emailul `emailId` ca sigur (safe), conform deciziei userului.
export const markEmailSafe = (emailId) =>
  apiClient.post(`/actions/emails/${emailId}/mark-safe`);

// Marchează emailul `emailId` ca phishing, conform deciziei userului.
export const markEmailPhishing = (emailId) =>
  apiClient.post(`/actions/emails/${emailId}/mark-phishing`);
