const TOKEN_KEY = 'secureinbox_token';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getStoredToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
};
