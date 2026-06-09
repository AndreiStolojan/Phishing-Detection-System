import { apiClient } from './apiClient.js';

export const getMe = () => apiClient.get('/users/me');

export const updateMe = (payload) => apiClient.patch('/users/me', payload);

export const updateAiSettings = (aiEnabled) =>
  apiClient.patch('/users/me/ai-settings', { aiEnabled: aiEnabled ? 1 : 0 });

export const updateNotificationSettings = (payload) => {
  const body = {};
  if (Object.hasOwn(payload, 'alertsEnabled')) body.alertsEnabled = payload.alertsEnabled ? 1 : 0;
  if (Object.hasOwn(payload, 'digestEnabled')) body.digestEnabled = payload.digestEnabled ? 1 : 0;
  if (Object.hasOwn(payload, 'digestHour')) body.digestHour = Number(payload.digestHour);
  return apiClient.patch('/users/me/notification-settings', body);
};
