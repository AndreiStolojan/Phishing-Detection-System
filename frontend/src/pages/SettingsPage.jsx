import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  disconnectMailAccount,
  getGoogleConnectUrl,
  getMailAccounts,
  updateMailAccountSettings,
} from '../api/mailAccountsApi.js';
import { updateAiSettings, updateMe } from '../api/usersApi.js';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [aiEnabled, setAiEnabled] = useState(Boolean(user?.settings?.aiEnabled));
  const [accounts, setAccounts] = useState([]);
  const [syncMaxResults, setSyncMaxResults] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const gmailAccount = useMemo(
    () => accounts.find((account) => account.provider === 'gmail' && account.status === 'active'),
    [accounts]
  );
  const displayName = name.trim() || user?.name || 'User';

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mailAccounts = await getMailAccounts();
      setAccounts(mailAccounts);
      const gmail = mailAccounts.find((account) => account.provider === 'gmail' && account.status === 'active');
      setSyncMaxResults(gmail?.syncMaxResults ?? 10);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setName(user?.name || '');
    setAiEnabled(Boolean(user?.settings?.aiEnabled));
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      await updateMe({ name });
      await updateAiSettings(aiEnabled);

      if (gmailAccount) {
        await updateMailAccountSettings(gmailAccount._id, Number(syncMaxResults));
      }

      await refreshUser();
      await loadSettings();
      setStatus('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      const result = await getGoogleConnectUrl();
      window.location.assign(result.authUrl);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!gmailAccount) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await disconnectMailAccount(gmailAccount._id);
      await loadSettings();
      setStatus('Gmail disconnected.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading settings" />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 920, mx: 'auto' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Account, Gmail sync size, and local AI explainability.
          </Typography>
        </Box>

        <ErrorMessage message={error} />
        {searchParams.get('gmail') === 'connected' ? (
          <Alert severity="success" variant="outlined">
            Gmail connected successfully.
          </Alert>
        ) : null}
        {searchParams.get('gmail') === 'error' ? (
          <Alert severity="error" variant="outlined">
            Gmail connection failed: {searchParams.get('code') || 'unknown error'}.
          </Alert>
        ) : null}
        {status ? (
          <Typography variant="body2" color="success.main">
            {status}
          </Typography>
        ) : null}

        <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={900}>
                Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This name is used in the app interface.
              </Typography>
            </Box>
            <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <FormControlLabel
              control={<Switch checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} />}
              label="Use local AI explainability when available"
            />
            <Button
              startIcon={<SaveOutlinedIcon />}
              variant="contained"
              onClick={handleSaveProfile}
              disabled={saving}
              sx={{ alignSelf: 'flex-start' }}
            >
              Save settings
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
              <Box>
                <Typography variant="subtitle1" fontWeight={900}>
                  Gmail connection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {gmailAccount ? `${displayName} is connected to Gmail.` : `${displayName} has no Gmail connection yet.`}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  px: 1,
                  py: 0.5,
                  border: 1,
                  borderColor: gmailAccount ? 'success.main' : 'divider',
                  borderRadius: 1,
                  color: gmailAccount ? 'success.main' : 'text.secondary',
                }}
              >
                {gmailAccount ? <CheckCircleOutlineIcon fontSize="small" /> : <LinkOutlinedIcon fontSize="small" />}
                <Typography variant="caption" fontWeight={800}>
                  {gmailAccount ? 'Connected' : 'Not connected'}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <TextField
              label="Sync size"
              type="number"
              value={syncMaxResults}
              onChange={(event) => setSyncMaxResults(event.target.value)}
              inputProps={{ min: 1, max: 50 }}
              helperText="Gmail sync fetches between 1 and 50 Inbox messages."
              disabled={!gmailAccount}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {gmailAccount ? (
                <Button
                  startIcon={<DeleteOutlineIcon />}
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  disabled={saving}
                >
                  Disconnect {displayName}
                </Button>
              ) : (
                <Button
                  startIcon={<CheckCircleOutlineIcon />}
                  variant="contained"
                  onClick={handleConnectGmail}
                  disabled={saving}
                >
                  Connect Gmail
                </Button>
              )}
              <Button
                startIcon={<SaveOutlinedIcon />}
                variant="outlined"
                onClick={handleSaveProfile}
                disabled={saving || !gmailAccount}
              >
                Save sync size
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
