// ─────────────────────────────────────────────────────────────────────────────
// scansApi.js — apeluri pentru scanarea emailurilor (motorul anti-phishing).
//
// Ce face, pe scurt: declanșează o rescanare manuală a unui email ("Scan again")
// și citește ultimul rezultat de scanare (scor, verdict, explicație).
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Pornește o rescanare manuală a emailului `emailId`.
export const scanEmail = (emailId) => apiClient.post(`/scans/emails/${emailId}`);

// Returnează cel mai recent rezultat de scanare pentru emailul `emailId`.
export const getLatestScan = (emailId) => apiClient.get(`/scans/emails/${emailId}/latest`);
