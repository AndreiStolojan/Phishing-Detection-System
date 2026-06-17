// ─────────────────────────────────────────────────────────────────────────────
// usersApi.js — apeluri pentru profilul și setările userului curent.
//
// Ce face, pe scurt: citește/actualizează/șterge contul ("me") și setările
// legate de AI și notificări.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Returnează datele userului autentificat (id, email, setări etc.).
export const getMe = () => apiClient.get('/users/me');

// Actualizează parțial profilul userului (ex. nume).
export const updateMe = (payload) => apiClient.patch('/users/me', payload);

// Șterge definitiv contul userului curent.
export const deleteMe = () => apiClient.del('/users/me');

// Activează/dezactivează analiza AI pentru scanări. Backend-ul vrea 0/1, nu
// true/false, de aceea transformăm boolean-ul primit.
export const updateAiSettings = (aiEnabled) =>
  apiClient.patch('/users/me/ai-settings', { aiEnabled: aiEnabled ? 1 : 0 });

// Actualizează setările de notificări (alerte, digest zilnic, ora digest-ului).
// Trimite doar câmpurile care au fost efectiv date în `payload` (verificăm cu
// Object.hasOwn), ca să nu suprascriem accidental valori netrimise.
export const updateNotificationSettings = (payload) => {
  const body = {};
  if (Object.hasOwn(payload, 'alertsEnabled')) body.alertsEnabled = payload.alertsEnabled ? 1 : 0;
  if (Object.hasOwn(payload, 'digestEnabled')) body.digestEnabled = payload.digestEnabled ? 1 : 0;
  if (Object.hasOwn(payload, 'digestHour')) body.digestHour = Number(payload.digestHour);
  return apiClient.patch('/users/me/notification-settings', body);
};
