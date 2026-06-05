import { apiClient } from './apiClient.js';

export const sendContactMessage = ({ subject, message }) =>
  apiClient.post('/contact/message', { subject, message });
