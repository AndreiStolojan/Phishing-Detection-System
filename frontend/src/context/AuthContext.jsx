import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { login as loginRequest, logout as logoutRequest, register as registerRequest } from '../api/authApi.js';
import { getCurrentUser } from '../api/usersApi.js';
import { clearAuthToken, getAuthToken, setAuthToken } from '../utils/tokenStorage.js';

export const AuthContext = createContext(null);

const isInvalidSessionError = (error) => (
    error?.status === 401 ||
    error?.statusCode === 401 ||
    error?.code === 'AUTH_TOKEN_EXPIRED' ||
    error?.code === 'AUTH_TOKEN_INVALID' ||
    error?.code === 'AUTH_USER_NOT_FOUND'
);

const getAuthTokenFromResult = (authResult) => authResult?.token ?? null;

export const AuthProvider = ({ children }) => {
    const [token, setTokenState] = useState(() => getAuthToken());
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(() => Boolean(getAuthToken()));
    const [authError, setAuthError] = useState(null);

    const clearSession = useCallback(() => {
        clearAuthToken();
        setTokenState(null);
        setUser(null);
    }, []);

    const refreshCurrentUser = useCallback(async () => {
        const storedToken = getAuthToken();

        if (!storedToken) {
            clearSession();
            return null;
        }

        setTokenState(storedToken);

        try {
            const currentUser = await getCurrentUser();

            setUser(currentUser);
            setAuthError(null);

            return currentUser;
        } catch (error) {
            if (isInvalidSessionError(error)) {
                clearSession();
                return null;
            }

            setAuthError(error.message);
            throw error;
        }
    }, [clearSession]);

    const applyAuthResult = useCallback(async (authResult) => {
        const nextToken = getAuthTokenFromResult(authResult);

        if (!nextToken) {
            throw new Error('Authentication response did not include a token.');
        }

        setAuthToken(nextToken);
        setTokenState(nextToken);

        if (authResult?.user) {
            setUser(authResult.user);
            setAuthError(null);

            return authResult.user;
        }

        return refreshCurrentUser();
    }, [refreshCurrentUser]);

    const register = useCallback(async (payload) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const authResult = await registerRequest(payload);

            return await applyAuthResult(authResult);
        } catch (error) {
            setAuthError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [applyAuthResult]);

    const login = useCallback(async (payload) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const authResult = await loginRequest(payload);

            return await applyAuthResult(authResult);
        } catch (error) {
            setAuthError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [applyAuthResult]);

    const logout = useCallback(async () => {
        setIsLoading(true);

        try {
            await logoutRequest();
        } catch {
            // Backend logout is client-side for this MVP, so local cleanup must still happen.
        } finally {
            setAuthError(null);
            clearSession();
            setIsLoading(false);
        }
    }, [clearSession]);

    const clearError = useCallback(() => {
        setAuthError(null);
    }, []);

    useEffect(() => {
        let isActive = true;

        const bootstrapSession = async () => {
            if (!getAuthToken()) {
                if (isActive) {
                    setIsLoading(false);
                }

                return;
            }

            try {
                await refreshCurrentUser();
            } catch {
                // refreshCurrentUser already stores the readable error message.
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        bootstrapSession();

        return () => {
            isActive = false;
        };
    }, [refreshCurrentUser]);

    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        authError,
        login,
        register,
        logout,
        refreshCurrentUser,
        clearError,
    }), [
        user,
        token,
        isLoading,
        authError,
        login,
        register,
        logout,
        refreshCurrentUser,
        clearError,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
