import { apiClient } from './apiClient.js';

export const getMe = () => apiClient.get('/users/me');

export const updateMe = (payload) => apiClient.patch('/users/me', payload);

export const updateAiSettings = (aiEnabled) =>
  apiClient.patch('/users/me/ai-settings', { aiEnabled: aiEnabled ? 1 : 0 });
