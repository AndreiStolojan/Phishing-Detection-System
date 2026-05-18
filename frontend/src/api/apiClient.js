import { getAuthToken } from '../utils/tokenStorage.js';

const DEFAULT_API_BASE_URL = '/api/v1';

const normalizeBaseUrl = (baseUrl) => {
    const value = baseUrl || DEFAULT_API_BASE_URL;

    return value.endsWith('/') ? value.slice(0, -1) : value;
};

const API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL);

export class ApiError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = options.status ?? null;
        this.statusCode = options.statusCode ?? options.status ?? null;
        this.code = options.code ?? null;
        this.errors = options.errors ?? [];
        this.payload = options.payload ?? null;
        this.data = options.payload ?? null;
        this.response = options.response ?? null;
    }
}

const formatErrors = (errors) => {
    if (!Array.isArray(errors) || errors.length === 0) {
        return null;
    }

    const messages = errors
        .map((error) => {
            if (typeof error === 'string') {
                return error;
            }

            if (error?.message) {
                return error.message;
            }

            return null;
        })
        .filter(Boolean);

    return messages.length > 0 ? messages.join(' ') : null;
};

const buildErrorMessage = (payload, response) => {
    if (payload && typeof payload === 'object') {
        const detailMessage = formatErrors(payload.errors);

        if (payload.message && detailMessage) {
            return `${payload.message}: ${detailMessage}`;
        }

        if (payload.message) {
            return payload.message;
        }

        if (detailMessage) {
            return detailMessage;
        }
    }

    if (typeof payload === 'string' && payload.trim()) {
        return payload;
    }

    if (response) {
        return `Request failed with status ${response.status}`;
    }

    return 'Request failed';
};

const createApiError = (payload, response) => new ApiError(
    buildErrorMessage(payload, response),
    {
        status: response?.status ?? payload?.statusCode ?? null,
        statusCode: payload?.statusCode ?? response?.status ?? null,
        code: payload?.code ?? null,
        errors: payload?.errors ?? [],
        payload,
        response: response
            ? {
                status: response.status,
                data: payload,
            }
            : null,
    }
);

const parseResponseBody = async (response) => {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const buildUrl = (path, params) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const queryParams = new URLSearchParams();

    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}${normalizedPath}`;

    return queryString ? `${url}?${queryString}` : url;
};

const isFormBody = (body) => (
    typeof FormData !== 'undefined' && body instanceof FormData
);

const request = async (path, options = {}) => {
    const {
        method = 'GET',
        body,
        headers = {},
        params,
        ...fetchOptions
    } = options;

    const token = getAuthToken();
    const requestHeaders = {
        Accept: 'application/json',
        ...headers,
    };

    if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
    }

    const hasBody = body !== undefined && body !== null;
    const shouldSerializeJson = hasBody && !isFormBody(body);

    if (shouldSerializeJson && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    let response;

    try {
        response = await fetch(buildUrl(path, params), {
            method,
            headers: requestHeaders,
            body: shouldSerializeJson ? JSON.stringify(body) : body,
            ...fetchOptions,
        });
    } catch (error) {
        throw new ApiError(
            error?.message || 'Network error. Make sure the backend server is running.',
            {
                code: 'NETWORK_ERROR',
                payload: error,
            }
        );
    }

    const payload = await parseResponseBody(response);

    if (!response.ok) {
        throw createApiError(payload, response);
    }

    if (payload && typeof payload === 'object' && payload.success === false) {
        throw createApiError(payload, response);
    }

    if (payload && typeof payload === 'object' && payload.success === true) {
        return Object.prototype.hasOwnProperty.call(payload, 'data')
            ? payload.data
            : null;
    }

    return payload;
};

export const apiClient = {
    get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
    del: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
};

export const isApiError = (error) => error instanceof ApiError;

export default apiClient;
