import { clearStoredToken, getStoredToken } from '../utils/tokenStorage.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor({ message, statusCode, code, errors }) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || null;
    this.errors = errors || [];
  }
}

const parseResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const buildHeaders = ({ body, headers }) => {
  const token = getStoredToken();

  return {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

export const apiRequest = async (path, options = {}) => {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: buildHeaders({ body, headers }),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await parseResponsePayload(response);

  if (!response.ok || payload.success === false) {
    if (response.status === 401 && payload.code?.startsWith('AUTH_')) {
      clearStoredToken();
    }

    throw new ApiError({
      message: payload.message || 'Request failed.',
      statusCode: payload.statusCode || response.status,
      code: payload.code,
      errors: payload.errors,
    });
  }

  return Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
};

export const apiClient = {
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  del: (path) => apiRequest(path, { method: 'DELETE' }),
};
