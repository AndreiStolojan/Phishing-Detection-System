import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';

import { useAuth } from '../../hooks/useAuth.js';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/emails': 'Emailuri',
  '/reports': 'Rapoarte',
  '/settings': 'Setări',
};

const getPageTitle = (pathname) => {
  const matchingPath = Object.keys(pageTitles)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  return pageTitles[matchingPath] || 'Aplicație';
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

const Topbar = ({
  drawerWidth,
  onMenuClick,
  onSupportClick,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname]
  );

  const displayName = user?.name || user?.email || 'Utilizator';
  const initials = getInitials(user);
  const avatarDataUrl = user?.avatarDataUrl || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: 'rgba(7, 12, 22, 0.84)',
        backgroundImage:
          'linear-gradient(90deg, rgba(34, 211, 238, 0.07), rgba(52, 211, 153, 0.035), rgba(7, 12, 22, 0))',
        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
        boxShadow: '0 16px 38px rgba(2, 6, 23, 0.22)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 64, sm: 70 },
          px: { xs: 2, sm: 3, lg: 4 },
          gap: 2,
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          aria-label="Deschide navigarea"
          sx={{ display: { md: 'none' } }}
        >
          <MenuRoundedIcon />
        </IconButton>

        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ minWidth: 0, flexGrow: 1 }}
        >
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 34,
              height: 34,
              flex: '0 0 auto',
              borderRadius: 1.5,
              color: '#03111c',
              background:
                'linear-gradient(135deg, #22d3ee 0%, #34d399 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 12px 28px rgba(34, 211, 238, 0.12)',
            }}
          >
            <SecurityRoundedIcon sx={{ fontSize: 20 }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
              sx={{
                display: { xs: 'none', sm: 'block' },
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              XAI Phishing Shield
            </Typography>
            <Typography variant="h6" fontWeight={900} noWrap>
              {pageTitle}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Tooltip title="Contact suport">
            <IconButton
              color="inherit"
              onClick={onSupportClick}
              aria-label="Deschide contact suport"
              sx={{
                border: '1px solid rgba(34, 211, 238, 0.22)',
                bgcolor: 'rgba(34, 211, 238, 0.08)',
              }}
            >
              <SupportAgentRoundedIcon />
            </IconButton>
          </Tooltip>

          <Avatar
            src={avatarDataUrl || undefined}
            alt={displayName}
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'rgba(34, 211, 238, 0.12)',
              color: 'primary.light',
              border: '1px solid rgba(34, 211, 238, 0.22)',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {avatarDataUrl ? null : initials}
          </Avatar>

          <Box
            sx={{
              display: { xs: 'none', sm: 'block' },
              minWidth: 0,
              maxWidth: 240,
            }}
          >
            <Typography variant="body2" fontWeight={800} noWrap>
              {displayName}
            </Typography>
            {user?.email ? (
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {user.email}
              </Typography>
            ) : null}
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<LogoutRoundedIcon fontSize="small" />}
            onClick={handleLogout}
            disabled={isLoading}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              borderColor: 'rgba(148, 163, 184, 0.28)',
              minWidth: 96,
              px: 1.5,
            }}
          >
            Logout
          </Button>

          <Tooltip title="Logout">
            <span>
              <IconButton
                color="inherit"
                onClick={handleLogout}
                disabled={isLoading}
                aria-label="Logout"
                sx={{
                  display: { xs: 'inline-flex', sm: 'none' },
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                }}
              >
                <LogoutRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
