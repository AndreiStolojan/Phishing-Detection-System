import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

import SupportChatDrawer from '../chat/SupportChatDrawer.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const drawerWidth = 276;

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const openMobileNavigation = () => {
    setMobileOpen(true);
  };

  const closeMobileNavigation = () => {
    setMobileOpen(false);
  };

  const openSupport = () => {
    setSupportOpen(true);
  };

  const closeSupport = () => {
    setSupportOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        background:
          'linear-gradient(180deg, rgba(13, 21, 36, 0.92) 0%, rgba(7, 11, 20, 0.98) 100%)',
        color: 'text.primary',
        overflowX: 'hidden',
      }}
    >
      <Topbar
        drawerWidth={drawerWidth}
        onMenuClick={openMobileNavigation}
        onSupportClick={openSupport}
      />
      <Sidebar
        drawerWidth={drawerWidth}
        mobileOpen={mobileOpen}
        onClose={closeMobileNavigation}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          pt: { xs: 8.5, sm: 9.5 },
          px: { xs: 2, sm: 3, lg: 4, xl: 5 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Box
          key={location.pathname}
          component={motion.div}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          sx={{
            width: '100%',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Box>
      </Box>
      <SupportChatDrawer
        open={supportOpen}
        onClose={closeSupport}
      />
    </Box>
  );
};

export default AppLayout;
