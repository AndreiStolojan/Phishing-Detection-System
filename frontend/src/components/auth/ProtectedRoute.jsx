import { Navigate, Outlet, useLocation } from 'react-router-dom';

import LoadingState from '../common/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState label="Checking session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
