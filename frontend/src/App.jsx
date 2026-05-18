import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmailDetailPage from './pages/EmailDetailPage.jsx';
import EmailsPage from './pages/EmailsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const AppLoading = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      bgcolor: 'background.default',
    }}
  >
    <CircularProgress size={28} />
  </Box>
);

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute loadingFallback={<AppLoading />} />
          }
        >
          <Route
            element={<AppLayout />}
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/emails" element={<EmailsPage />} />
            <Route path="/emails/:id" element={<EmailDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="*"
          element={
            <Navigate to="/dashboard" replace />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
