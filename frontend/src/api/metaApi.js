// ─────────────────────────────────────────────────────────────────────────────
// metaApi.js — apel pentru starea generală a backend-ului.
//
// Ce face, pe scurt: verifică dacă serverul (și dependențele lui, ex. Ollama)
// răspund — folosit pentru indicatori de stare în UI.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Returnează starea curentă a backend-ului (ex. disponibilitate AI).
export const getMetaStatus = () => apiClient.get('/meta/status');
