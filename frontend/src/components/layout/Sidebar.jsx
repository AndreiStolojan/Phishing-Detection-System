import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { motion, useReducedMotion } from 'framer-motion';

import { useAuth } from '../../hooks/useAuth.js';

const navigationItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardRoundedIcon,
  },
  {
    label: 'Emailuri',
    path: '/emails',
    icon: EmailRoundedIcon,
  },
  {
    label: 'Rapoarte',
    path: '/reports',
    icon: AssessmentRoundedIcon,
  },
  {
    label: 'Setări',
    path: '/settings',
    icon: SettingsRoundedIcon,
  },
];

const isActivePath = (currentPath, itemPath) => {
  if (itemPath === '/dashboard') {
    return currentPath === itemPath;
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
};

const getInitials = (user) => {
  const source = user?.name || user?.email || 'Utilizator';
  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
};

const SidebarContent = ({
  isCollapsed = false,
  onNavigate,
  onToggleCollapse,
  showCollapseToggle = true,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const activeIndicatorId = useId();
  const { user, logout, isLoading } = useAuth();

  const displayName = user?.name || user?.email || 'Utilizator';
  const initials = getInitials(user);
  const avatarDataUrl = user?.avatarDataUrl || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleOpenProfile = () => {
    if (typeof onNavigate === 'function') {
      onNavigate();
    }

    navigate('/settings#profile');
  };

  return (
    <Stack sx={{ height: '100%' }}>
      <Box
        component={motion.div}
        initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        sx={{
          px: isCollapsed ? 1.5 : 2.25,
          py: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent={isCollapsed ? 'center' : 'space-between'}
        >
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Tooltip title={isCollapsed ? 'XAI Phishing Shield' : ''} placement="right">
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 44,
                  height: 44,
                  flex: '0 0 auto',
                  borderRadius: 2,
                  color: '#03111c',
                  background:
                    'linear-gradient(135deg, #22d3ee 0%, #34d399 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 18px 38px rgba(34, 211, 238, 0.14)',
                }}
              >
                <SecurityRoundedIcon sx={{ fontSize: 24 }} />
              </Box>
            </Tooltip>

            {!isCollapsed ? (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={900} noWrap>
                  XAI Phishing Shield
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  Security console
                </Typography>
              </Box>
            ) : null}
          </Stack>

          {showCollapseToggle && !isCollapsed ? (
            <Tooltip title="Comută sidebar">
              <IconButton
                size="small"
                onClick={onToggleCollapse}
                aria-label="Comută sidebar"
                sx={{
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  bgcolor: 'rgba(15, 23, 42, 0.46)',
                }}
              >
                <MenuRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}

          {showCollapseToggle && isCollapsed ? (
            <Box sx={{ position: 'absolute', top: 72, left: 18 }}>
              <Tooltip title="Comută sidebar" placement="right">
                <IconButton
                  size="small"
                  onClick={onToggleCollapse}
                  aria-label="Comută sidebar"
                  sx={{
                    width: 40,
                    height: 40,
                    border: '1px solid rgba(34, 211, 238, 0.24)',
                    bgcolor: 'rgba(34, 211, 238, 0.08)',
                  }}
                >
                  <MenuRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      <List
        dense
        sx={{
          px: isCollapsed ? 1 : 1.5,
          py: isCollapsed ? 7 : 1.5,
        }}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const selected = isActivePath(location.pathname, item.path);

          return (
            <Box
              key={item.path}
              component={motion.div}
              initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Tooltip title={isCollapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  selected={selected}
                  onClick={onNavigate}
                  sx={{
                    position: 'relative',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    minHeight: 44,
                    borderRadius: 1.25,
                    mb: 0.5,
                    overflow: 'hidden',
                    px: isCollapsed ? 0 : 1.5,
                    color: selected ? 'text.primary' : 'text.secondary',
                    transition:
                      'background-color 160ms ease, color 160ms ease, transform 160ms ease',
                    '&:hover': {
                      bgcolor: 'rgba(34, 211, 238, 0.08)',
                      color: 'text.primary',
                      transform: isCollapsed ? 'none' : 'translateX(2px)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'transparent',
                      color: 'primary.light',
                    },
                    '&.Mui-selected:hover': {
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  {selected ? (
                    <Box
                      component={motion.span}
                      layoutId={shouldReduceMotion ? undefined : `active-sidebar-item-${activeIndicatorId}`}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 1.25,
                        background:
                          'linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(52, 211, 153, 0.1))',
                        border: '1px solid rgba(34, 211, 238, 0.22)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                      }}
                    />
                  ) : null}

                  <ListItemIcon
                    sx={{
                      justifyContent: 'center',
                      minWidth: isCollapsed ? 0 : 36,
                      color: 'inherit',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {!isCollapsed ? (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: selected ? 850 : 700,
                      }}
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                      }}
                    />
                  ) : null}
                </ListItemButton>
              </Tooltip>
            </Box>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          px: isCollapsed ? 1 : 2,
          pt: 1.75,
          pb: 1.25,
          borderTop: '1px solid rgba(148, 163, 184, 0.12)',
        }}
      >
        <Stack spacing={1.25}>
          <Tooltip title={isCollapsed ? 'Deschide profilul' : ''} placement="right">
            <ButtonBase
              onClick={handleOpenProfile}
              aria-label="Deschide profilul utilizatorului"
              sx={{
                width: '100%',
                minWidth: 0,
                borderRadius: 1.25,
                textAlign: 'left',
                display: 'block',
                transition:
                  'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
                '&:hover': {
                  bgcolor: isCollapsed ? 'rgba(34, 211, 238, 0.08)' : 'rgba(34, 211, 238, 0.07)',
                  transform: isCollapsed ? 'none' : 'translateY(-1px)',
                },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent={isCollapsed ? 'center' : 'flex-start'}
                sx={{
                  minWidth: 0,
                  p: isCollapsed ? 0.5 : 1,
                  borderRadius: 1.25,
                  bgcolor: isCollapsed ? 'transparent' : 'rgba(15, 23, 42, 0.42)',
                  border: isCollapsed ? '0' : '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                <Avatar
                  src={avatarDataUrl || undefined}
                  alt={displayName}
                  sx={{
                    width: 38,
                    height: 38,
                    flex: '0 0 auto',
                    bgcolor: 'rgba(34, 211, 238, 0.12)',
                    color: 'primary.light',
                    border: '1px solid rgba(34, 211, 238, 0.22)',
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {avatarDataUrl ? null : initials}
                </Avatar>

                {!isCollapsed ? (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={850} noWrap>
                      {displayName}
                    </Typography>
                    {user?.email ? (
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {user.email}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="primary.light" noWrap component="div">
                      Deschide profilul
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </ButtonBase>
          </Tooltip>

          <Tooltip title={isCollapsed ? 'Logout' : ''} placement="right">
            <span>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                startIcon={isCollapsed ? null : <LogoutRoundedIcon fontSize="small" />}
                onClick={handleLogout}
                disabled={isLoading}
                aria-label="Logout"
                sx={{
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  minWidth: 0,
                  px: isCollapsed ? 0 : 1.25,
                }}
              >
                {isCollapsed ? <LogoutRoundedIcon fontSize="small" /> : 'Logout'}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Box
        sx={{
          px: isCollapsed ? 0.75 : 2,
          pb: 1.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          textAlign={isCollapsed ? 'center' : 'left'}
          sx={{
            px: isCollapsed ? 0 : 1,
            lineHeight: 1.25,
            opacity: 0.78,
          }}
        >
          {isCollapsed ? 'XAI' : 'XAI - toate drepturile rezervate'}
        </Typography>
      </Box>
    </Stack>
  );
};

const Sidebar = ({
  drawerWidth,
  expandedWidth,
  isCollapsed = false,
  mobileOpen,
  onClose,
  onResize,
  onToggleCollapse,
  sizing,
  transition,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({
    x: 0,
    width: expandedWidth,
  });

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.x;

      onResize(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.body.classList.remove('sidebar-resizing');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.classList.remove('sidebar-resizing');
    };
  }, [isResizing, onResize]);

  const startResize = (event) => {
    if (isCollapsed) {
      return;
    }

    event.preventDefault();
    resizeStartRef.current = {
      x: event.clientX,
      width: expandedWidth,
    };
    document.body.classList.add('sidebar-resizing');
    setIsResizing(true);
  };

  const drawerSx = {
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
      bgcolor: 'rgba(7, 12, 22, 0.96)',
      backgroundImage:
        'linear-gradient(180deg, rgba(34, 211, 238, 0.065), rgba(7, 12, 22, 0) 34%)',
      borderRight: '1px solid rgba(148, 163, 184, 0.16)',
      boxShadow: '18px 0 48px rgba(2, 6, 23, 0.28)',
      backdropFilter: 'blur(18px)',
      transition,
      overflowX: 'hidden',
    },
  };

  return (
    <Box
      component="nav"
      sx={{
        width: { md: drawerWidth },
        flexShrink: { md: 0 },
        transition,
      }}
      aria-label="Navigare principală"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          ...drawerSx,
          '& .MuiDrawer-paper': {
            ...drawerSx['& .MuiDrawer-paper'],
            width: Math.min(expandedWidth, 300),
          },
        }}
      >
        <SidebarContent
          onNavigate={onClose}
          showCollapseToggle={false}
        />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          ...drawerSx,
        }}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        {!isCollapsed ? (
          <Box
            role="separator"
            aria-label={`Redimensionează sidebar între ${sizing.minWidth} și ${sizing.maxWidth} pixeli`}
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={startResize}
            sx={{
              position: 'absolute',
              top: 0,
              right: -4,
              width: 8,
              height: '100%',
              cursor: 'col-resize',
              zIndex: 3,
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 84,
                right: 3,
                width: 2,
                height: 'calc(100% - 168px)',
                borderRadius: 999,
                bgcolor: isResizing
                  ? 'rgba(34, 211, 238, 0.74)'
                  : 'rgba(148, 163, 184, 0.18)',
                transition: 'background-color 160ms ease',
              },
              '&:hover::after': {
                bgcolor: 'rgba(34, 211, 238, 0.58)',
              },
            }}
          />
        ) : null}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
