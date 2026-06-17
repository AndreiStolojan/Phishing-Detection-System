// ─────────────────────────────────────────────────────────────────────────────
// contactApi.js — apel pentru formularul de contact.
//
// Ce face, pe scurt: trimite un mesaj (subiect + conținut) de la user către
// echipa/administratorul aplicației.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Trimite un mesaj de contact cu `subject` și `message`.
export const sendContactMessage = ({ subject, message }) =>
  apiClient.post('/contact/message', { subject, message });
