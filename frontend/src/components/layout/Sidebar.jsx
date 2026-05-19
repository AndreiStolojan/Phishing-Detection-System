import { useId } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Divider,
  Drawer,
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
  onNavigate,
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
          px: 2.25,
          py: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
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
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={900} noWrap>
                XAI Phishing Shield
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                Security console
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      <List
        dense
        sx={{
          px: 1.5,
          py: 1.5,
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
              <ListItemButton
                component={NavLink}
                to={item.path}
                selected={selected}
                onClick={onNavigate}
                sx={{
                  position: 'relative',
                  justifyContent: 'flex-start',
                  minHeight: 44,
                  borderRadius: 1.25,
                  mb: 0.5,
                  overflow: 'hidden',
                  px: 1.5,
                  color: selected ? 'text.primary' : 'text.secondary',
                  transition:
                    'background-color 160ms ease, color 160ms ease, transform 160ms ease',
                  '&:hover': {
                    bgcolor: 'rgba(34, 211, 238, 0.08)',
                    color: 'text.primary',
                    transform: 'translateX(2px)',
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
                      minWidth: 36,
                      color: 'inherit',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
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
                </ListItemButton>
            </Box>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          px: 2,
          pt: 1.75,
          pb: 1.25,
          borderTop: '1px solid rgba(148, 163, 184, 0.12)',
        }}
      >
        <Stack spacing={1.25}>
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
                bgcolor: 'rgba(34, 211, 238, 0.07)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="flex-start"
              sx={{
                minWidth: 0,
                p: 1,
                borderRadius: 1.25,
                bgcolor: 'rgba(15, 23, 42, 0.42)',
                border: '1px solid rgba(148, 163, 184, 0.14)',
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
            </Stack>
          </ButtonBase>

          <Tooltip title="Logout" placement="right">
            <span>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutRoundedIcon fontSize="small" />}
                onClick={handleLogout}
                disabled={isLoading}
                aria-label="Logout"
                sx={{
                  justifyContent: 'flex-start',
                  minWidth: 0,
                  px: 1.25,
                }}
              >
                Logout
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 1.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          textAlign="left"
          sx={{
            px: 1,
            lineHeight: 1.25,
            opacity: 0.78,
          }}
        >
          XAI - toate drepturile rezervate
        </Typography>
      </Box>
    </Stack>
  );
};

const Sidebar = ({
  drawerWidth,
  mobileOpen,
  onClose,
  transition,
}) => {
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
            width: Math.min(drawerWidth, 300),
          },
        }}
      >
        <SidebarContent onNavigate={onClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          ...drawerSx,
        }}
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );
};

export default Sidebar;
