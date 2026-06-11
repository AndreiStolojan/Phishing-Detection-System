import '@testing-library/jest-dom/vitest';

/*
  jsdom 27 removed its localStorage/sessionStorage implementations (pending an
  upstream rewrite), which broke the apiClient/authContext tests that exercise
  token storage. Provide a minimal in-memory Storage so tests behave like a
  real browser again.
*/
const createStorageStub = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', { value: createStorageStub() });
}
if (typeof window !== 'undefined' && !window.sessionStorage) {
  Object.defineProperty(window, 'sessionStorage', { value: createStorageStub() });
}
