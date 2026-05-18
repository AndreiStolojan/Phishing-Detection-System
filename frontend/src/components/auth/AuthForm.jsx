import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import { useAuth } from '../../hooks/useAuth.js';

const initialFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const getFieldError = (details) => {
  if (!Array.isArray(details) || details.length === 0) {
    return '';
  }

  return details
    .map((detail) => {
      if (typeof detail === 'string') {
        return detail;
      }

      return detail?.message || detail?.msg || '';
    })
    .filter(Boolean)
    .join('\n');
};

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data || error?.data || error?.payload;
  const code = data?.code || error?.code;
  const detailsMessage = getFieldError(data?.details || data?.errors || error?.errors);
  const message = data?.message || error?.message;

  if (code === 'USER_ALREADY_EXISTS' || message === 'User already exists') {
    return 'Există deja un cont cu această adresă de email.';
  }

  if (code === 'INVALID_CREDENTIALS' || message === 'Invalid email or password') {
    return 'Emailul sau parola este incorectă.';
  }

  return detailsMessage || message || 'A apărut o eroare la comunicarea cu serverul.';
};

const validateForm = (values, isRegisterMode) => {
  const email = values.email.trim();
  const name = values.name.trim();

  if (isRegisterMode && name.length < 2) {
    return 'Numele trebuie să aibă cel puțin 2 caractere.';
  }

  if (!email) {
    return 'Introdu adresa de email.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Adresa de email nu are un format valid.';
  }

  if (!values.password) {
    return 'Introdu parola.';
  }

  if (isRegisterMode && values.password.length < 6) {
    return 'Parola trebuie să aibă cel puțin 6 caractere.';
  }

  if (isRegisterMode && values.password !== values.confirmPassword) {
    return 'Parolele nu coincid.';
  }

  return '';
};

const AuthForm = () => {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState(initialFormValues);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login, register } = useAuth();

  const isRegisterMode = mode === 'register';

  const submitLabel = useMemo(
    () => (isRegisterMode ? 'Creează cont' : 'Autentifică-te'),
    [isRegisterMode]
  );

  const updateField = (field) => (event) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }));
    setError('');
  };

  const toggleMode = () => {
    setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'));
    setValues(initialFormValues);
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm(values, isRegisterMode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isRegisterMode) {
        await register({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        });
      } else {
        await login({
          email: values.email.trim(),
          password: values.password,
        });
      }

      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(getBackendErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 440,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: 2,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
        p: { xs: 3, sm: 4 },
      }}
    >
      <Stack spacing={3}>
        <Stack spacing={1.25} alignItems="center" textAlign="center">
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 56,
              height: 56,
              borderRadius: 2,
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: 'primary.main',
            }}
          >
            <ShieldRoundedIcon fontSize="large" />
          </Box>

          <Box>
            <Typography component="h1" variant="h4" fontWeight={700}>
              {isRegisterMode ? 'Creează cont' : 'Autentificare'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {isRegisterMode
                ? 'Completează datele pentru un cont nou.'
                : 'Intră în aplicație cu emailul și parola.'}
            </Typography>
          </Box>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.25}>
            {isRegisterMode ? (
              <TextField
                label="Nume"
                value={values.name}
                onChange={updateField('name')}
                autoComplete="name"
                fullWidth
                required
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRoundedIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            ) : null}

            <TextField
              label="Email"
              type="email"
              value={values.email}
              onChange={updateField('email')}
              autoComplete="email"
              fullWidth
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailRoundedIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Parolă"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={updateField('password')}
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              fullWidth
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRoundedIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPassword ? 'Ascunde parola' : 'Arată parola'}>
                      <IconButton
                        aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                        disabled={isSubmitting}
                        edge="end"
                        onClick={() => setShowPassword((isVisible) => !isVisible)}
                      >
                        {showPassword ? (
                          <VisibilityOffRoundedIcon />
                        ) : (
                          <VisibilityRoundedIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />

            {isRegisterMode ? (
              <TextField
                label="Confirmă parola"
                type={showConfirmPassword ? 'text' : 'password'}
                value={values.confirmPassword}
                onChange={updateField('confirmPassword')}
                autoComplete="new-password"
                fullWidth
                required
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip
                        title={showConfirmPassword ? 'Ascunde parola' : 'Arată parola'}
                      >
                        <IconButton
                          aria-label={
                            showConfirmPassword ? 'Ascunde parola' : 'Arată parola'
                          }
                          disabled={isSubmitting}
                          edge="end"
                          onClick={() =>
                            setShowConfirmPassword((isVisible) => !isVisible)
                          }
                        >
                          {showConfirmPassword ? (
                            <VisibilityOffRoundedIcon />
                          ) : (
                            <VisibilityRoundedIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            ) : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Se trimite...' : submitLabel}
            </Button>
          </Stack>
        </Box>

        <Divider />

        <Typography color="text.secondary" textAlign="center" variant="body2">
          {isRegisterMode ? 'Ai deja cont?' : 'Nu ai cont încă?'}{' '}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={toggleMode}
            sx={{ color: 'primary.main', fontWeight: 700 }}
          >
            {isRegisterMode ? 'Autentifică-te' : 'Creează cont'}
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
};

export default AuthForm;
