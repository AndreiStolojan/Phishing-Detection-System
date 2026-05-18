import apiClient from './apiClient.js';

export const getMetaStatus = () => apiClient.get('/meta/status');

export default {
    getMetaStatus,
};
