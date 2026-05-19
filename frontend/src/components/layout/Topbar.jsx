import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';

const Topbar = ({
  drawerWidth,
  onMenuClick,
  onSupportClick,
  transition,
}) => {
  const navigate = useNavigate();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        transition,
        bgcolor: 'rgba(7, 12, 22, 0.84)',
        backgroundImage:
          'linear-gradient(90deg, rgba(34, 211, 238, 0.055), rgba(52, 211, 153, 0.028), rgba(7, 12, 22, 0))',
        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
        boxShadow: '0 12px 30px rgba(2, 6, 23, 0.18)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 58, sm: 62 },
          px: { xs: 2, sm: 3, lg: 4 },
          gap: { xs: 1.25, sm: 2 },
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

        <Box sx={{ flexGrow: 1, minWidth: 0 }} />

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Tooltip title="Setări">
            <IconButton
              color="inherit"
              onClick={() => navigate('/settings')}
              aria-label="Deschide setările"
              sx={{
                border: '1px solid rgba(148, 163, 184, 0.18)',
                bgcolor: 'rgba(15, 23, 42, 0.36)',
              }}
            >
              <SettingsRoundedIcon />
            </IconButton>
          </Tooltip>

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
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
