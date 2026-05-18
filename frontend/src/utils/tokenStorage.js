const TOKEN_STORAGE_KEY = 'xai_licenta_auth_token';

const canUseLocalStorage = () => (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
);

export const getAuthToken = () => {
    if (!canUseLocalStorage()) {
        return null;
    }

    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token) => {
    if (!canUseLocalStorage()) {
        return;
    }

    if (!token) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
    if (!canUseLocalStorage()) {
        return;
    }

    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const hasAuthToken = () => Boolean(getAuthToken());

export { TOKEN_STORAGE_KEY };
