import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';

const ProtectedRoute = ({
    children,
    redirectTo = '/login',
    loadingFallback = null,
}) => {
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return loadingFallback;
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to={redirectTo}
                replace
                state={{ from: location }}
            />
        );
    }

    return children ?? <Outlet />;
};

export default ProtectedRoute;
