import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'register') {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }

      navigate(location.state?.from?.pathname || '/inbox', { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 3,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={2.25}>
          <Stack spacing={1} alignItems="flex-start">
            <LockOutlinedIcon color="primary" />
            <Typography variant="h5" fontWeight={900}>
              SecureInbox
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to review synced Gmail security signals.
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {mode === 'register' ? (
            <TextField
              label="Name"
              value={form.name}
              onChange={updateField('name')}
              autoComplete="name"
              required
              fullWidth
            />
          ) : null}
          <TextField
            label="Email"
            value={form.email}
            onChange={updateField('email')}
            autoComplete="email"
            type="email"
            required
            fullWidth
          />
          <TextField
            label="Password"
            value={form.password}
            onChange={updateField('password')}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            type="password"
            required
            fullWidth
          />

          <Button type="submit" variant="contained" disabled={submitting}>
            {mode === 'register' ? 'Create account' : 'Sign in'}
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
          >
            {mode === 'register' ? 'Use an existing account' : 'Create a new account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
