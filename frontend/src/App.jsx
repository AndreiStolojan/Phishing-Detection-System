import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InboxPage } from '@/pages/InboxPage';
import { SenderListsPage } from '@/pages/SenderListsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* /inbox/:emailId used to render a separate full-page report in the
            old design. The inbox is now a two-pane workspace where the reading
            pane holds everything, so the route redirects instead of showing a
            second, differently-styled view of the same message. Old links and
            bookmarks still land somewhere sensible. */}
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/:emailId" element={<Navigate to="/inbox" replace />} />
        <Route path="/sender-lists" element={<SenderListsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
