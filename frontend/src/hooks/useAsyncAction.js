import { useCallback, useState } from 'react';

export const useAsyncAction = (asyncAction, options = {}) => {
    const {
        initialResult = null,
        onSuccess,
        onError,
        resetErrorOnRun = true,
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(initialResult);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setResult(initialResult);
    }, [initialResult]);

    const run = useCallback(async (...args) => {
        if (typeof asyncAction !== 'function') {
            const missingActionError = new Error('useAsyncAction requires an async function.');

            setError(missingActionError);
            throw missingActionError;
        }

        setIsLoading(true);

        if (resetErrorOnRun) {
            setError(null);
        }

        try {
            const nextResult = await asyncAction(...args);

            setResult(nextResult);
            onSuccess?.(nextResult);

            return nextResult;
        } catch (actionError) {
            setError(actionError);
            onError?.(actionError);
            throw actionError;
        } finally {
            setIsLoading(false);
        }
    }, [asyncAction, onError, onSuccess, resetErrorOnRun]);

    return {
        isLoading,
        error,
        result,
        run,
        reset,
        setError,
        setResult,
    };
};

export default useAsyncAction;
