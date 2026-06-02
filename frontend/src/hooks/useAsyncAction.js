import { useCallback, useState } from 'react';

export const useAsyncAction = (action) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);
        return await action(...args);
      } catch (err) {
        setError(err.message || 'Action failed.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [action]
  );

  return {
    run,
    loading,
    error,
    clearError: () => setError(null),
  };
};
