import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#070b14',
      paper: '#0d1524',
    },
    primary: {
      main: '#22d3ee',
      light: '#67e8f9',
      dark: '#0891b2',
    },
    secondary: {
      main: '#34d399',
      light: '#6ee7b7',
      dark: '#059669',
    },
    error: {
      main: '#fb7185',
    },
    warning: {
      main: '#fbbf24',
    },
    success: {
      main: '#4ade80',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#9aa8bd',
    },
    divider: 'rgba(148, 163, 184, 0.16)',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: 0,
    },
    h4: {
      letterSpacing: 0,
    },
    h5: {
      letterSpacing: 0,
    },
    h6: {
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: '#f8fafc',
          backgroundColor: '#070b14',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 36,
          boxShadow: 'none',
          transition:
            'background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease, box-shadow 160ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 12px 28px rgba(2, 6, 23, 0.28)',
          },
          '&.Mui-disabled': {
            transform: 'none',
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          background:
            'linear-gradient(135deg, #22d3ee 0%, #34d399 100%)',
          color: '#03111c',
          '&:hover': {
            background:
              'linear-gradient(135deg, #67e8f9 0%, #6ee7b7 100%)',
          },
        },
        outlinedInherit: {
          borderColor: 'rgba(148, 163, 184, 0.24)',
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          '&:hover': {
            borderColor: 'rgba(34, 211, 238, 0.42)',
            backgroundColor: 'rgba(34, 211, 238, 0.08)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition:
            'background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: 'rgba(2, 6, 23, 0.3)',
          transition:
            'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
          '& fieldset': {
            borderColor: 'rgba(148, 163, 184, 0.2)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(34, 211, 238, 0.38)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(2, 6, 23, 0.44)',
            boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.1)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#22d3ee',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: 'rgba(148, 163, 184, 0.16)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 21, 36, 0.84)',
          backgroundImage:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0))',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          boxShadow: '0 18px 48px rgba(2, 6, 23, 0.28)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        action: {
          alignItems: 'center',
          paddingTop: 0,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          letterSpacing: 0,
          transition: 'color 160ms ease, background-color 160ms ease',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 999,
          background:
            'linear-gradient(90deg, #22d3ee 0%, #34d399 100%)',
        },
      },
    },
  },
});

export default theme;
