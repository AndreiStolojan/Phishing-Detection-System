import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

import SupportChatDrawer from '../chat/SupportChatDrawer.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const SIDEBAR_STORAGE_KEY = 'xai-sidebar-layout';
const COLLAPSED_SIDEBAR_WIDTH = 76;
const DEFAULT_SIDEBAR_WIDTH = 276;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 340;

const clampSidebarWidth = (value) => {
  const width = Number(value);

  if (!Number.isFinite(width)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
};

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') {
    return {
      isCollapsed: false,
      width: DEFAULT_SIDEBAR_WIDTH,
    };
  }

  try {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (!storedValue) {
      return {
        isCollapsed: false,
        width: DEFAULT_SIDEBAR_WIDTH,
      };
    }

    const parsedValue = JSON.parse(storedValue);

    return {
      isCollapsed: Boolean(parsedValue?.isCollapsed),
      width: clampSidebarWidth(parsedValue?.width),
    };
  } catch {
    return {
      isCollapsed: false,
      width: DEFAULT_SIDEBAR_WIDTH,
    };
  }
};

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState(getInitialSidebarState);
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const drawerWidth = sidebarState.isCollapsed
    ? COLLAPSED_SIDEBAR_WIDTH
    : sidebarState.width;

  const layoutTransition = shouldReduceMotion
    ? 'none'
    : 'width 220ms ease, margin-left 220ms ease';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      JSON.stringify(sidebarState)
    );
  }, [sidebarState]);

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

  const toggleSidebar = () => {
    setSidebarState((currentState) => ({
      ...currentState,
      isCollapsed: !currentState.isCollapsed,
    }));
  };

  const resizeSidebar = (nextWidth) => {
    setSidebarState((currentState) => ({
      ...currentState,
      width: clampSidebarWidth(nextWidth),
      isCollapsed: false,
    }));
  };

  const sidebarSizing = useMemo(() => ({
    collapsedWidth: COLLAPSED_SIDEBAR_WIDTH,
    minWidth: MIN_SIDEBAR_WIDTH,
    maxWidth: MAX_SIDEBAR_WIDTH,
  }), []);

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
        transition={layoutTransition}
      />
      <Sidebar
        drawerWidth={drawerWidth}
        expandedWidth={sidebarState.width}
        isCollapsed={sidebarState.isCollapsed}
        mobileOpen={mobileOpen}
        onClose={closeMobileNavigation}
        onResize={resizeSidebar}
        onToggleCollapse={toggleSidebar}
        sizing={sidebarSizing}
        transition={layoutTransition}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          transition: layoutTransition,
          minHeight: '100vh',
          pt: { xs: 7.75, sm: 8.5 },
          px: { xs: 2, sm: 3, lg: sidebarState.isCollapsed ? 5 : 4, xl: 5 },
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
