import apiClient from './apiClient.js';

export const getCurrentUser = () => apiClient.get('/users/me');

export const updateCurrentUser = (payload = {}) => (
    apiClient.patch('/users/me', payload)
);

export const updateAiSettings = (aiEnabled) => (
    apiClient.patch('/users/me/ai-settings', {
        aiEnabled: aiEnabled ? 1 : 0,
    })
);

export default {
    getCurrentUser,
    updateCurrentUser,
    updateAiSettings,
};
