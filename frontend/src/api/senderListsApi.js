import { apiClient } from './apiClient.js';

export const getSenderLists = ({ withMatchCounts = false } = {}) =>
  apiClient.get(`/sender-lists${withMatchCounts ? '?withMatchCounts=1' : ''}`);

export const addSenderListEntry = ({ listType, kind, value }) =>
  apiClient.post('/sender-lists', { listType, kind, value });

export const removeSenderListEntry = (id) => apiClient.del(`/sender-lists/${id}`);
