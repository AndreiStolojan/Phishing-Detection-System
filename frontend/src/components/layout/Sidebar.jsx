import { useId } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { motion, useReducedMotion } from 'framer-motion';

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

const SidebarContent = ({ onNavigate }) => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const activeIndicatorId = useId();

  return (
    <Stack sx={{ height: '100%' }}>
      <Box
        component={motion.div}
        initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        sx={{ px: 2.25, py: 2.25 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 44,
              height: 44,
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
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      <List dense sx={{ px: 1.5, py: 1.5 }}>
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
                  minHeight: 44,
                  borderRadius: 1.25,
                  mb: 0.5,
                  overflow: 'hidden',
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
          px: 2.25,
          py: 2,
          borderTop: '1px solid rgba(148, 163, 184, 0.12)',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          @XAI - drepturi rezervate
        </Typography>
      </Box>
    </Stack>
  );
};

const Sidebar = ({
  drawerWidth,
  mobileOpen,
  onClose,
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
    },
  };

  return (
    <Box
      component="nav"
      sx={{
        width: { md: drawerWidth },
        flexShrink: { md: 0 },
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
