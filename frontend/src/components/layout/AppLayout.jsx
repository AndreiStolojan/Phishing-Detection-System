import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';

const navItems = [
  { label: 'Inbox', path: '/inbox', icon: <InboxOutlinedIcon /> },
  { label: 'Status', path: '/dashboard', icon: <DashboardOutlinedIcon /> },
  { label: 'Reports', path: '/reports', icon: <QueryStatsOutlinedIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsOutlinedIcon /> },
];

export default function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' } }}>
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: '#11151c',
        }}
      >
        <Box sx={{ px: 2.5, py: 2.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ShieldOutlinedIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              SecureInbox
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gmail security layer
            </Typography>
          </Box>
        </Box>
        <Divider />
        <List sx={{ px: 1.25, py: 1.25, flex: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: 'text.secondary',
                '&.active': {
                  color: 'text.primary',
                  bgcolor: 'rgba(138, 180, 248, 0.12)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email}
          </Typography>
          <Button
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            fullWidth
            variant="outlined"
            sx={{ mt: 1.5, justifyContent: 'flex-start' }}
          >
            Sign out
          </Button>
        </Box>
      </Box>

      <Box component="main" sx={{ minWidth: 0, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            gap: 0.75,
            p: 1,
            overflowX: 'auto',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: '#11151c',
          }}
        >
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={NavLink}
              to={item.path}
              startIcon={item.icon}
              size="small"
              sx={{
                flexShrink: 0,
                color: 'text.secondary',
                '&.active': {
                  color: 'text.primary',
                  bgcolor: 'rgba(138, 180, 248, 0.12)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
        <Outlet />
      </Box>
    </Box>
  );
}
