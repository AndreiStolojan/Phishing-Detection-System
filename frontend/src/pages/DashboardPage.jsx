import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getMailAccounts, syncMailAccount } from '../api/mailAccountsApi.js';
import { getMetaStatus } from '../api/metaApi.js';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const activeGmailAccount = useMemo(
    () => accounts.find((account) => account.provider === 'gmail' && account.status === 'active'),
    [accounts]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [meta, mailAccounts] = await Promise.all([getMetaStatus(), getMailAccounts()]);
      setStatus(meta);
      setAccounts(mailAccounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSync = async () => {
    if (!activeGmailAccount) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await syncMailAccount(activeGmailAccount._id);
      setSyncResult(result);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading status" />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Account status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check Gmail status and run manual sync when you want fresh security results.
          </Typography>
        </Box>

        {searchParams.get('gmail') === 'connected' ? (
          <Alert severity="success">Gmail connected successfully.</Alert>
        ) : null}
        {searchParams.get('gmail') === 'error' ? (
          <Alert severity="error">Gmail connection failed: {searchParams.get('code') || 'unknown error'}.</Alert>
        ) : null}
        <ErrorMessage message={error} />

        <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                Gmail
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeGmailAccount
                  ? `${user?.name || 'User'} is connected to Gmail.`
                  : 'No Gmail account connected.'}
              </Typography>
            </Box>
            {activeGmailAccount ? (
              <Button startIcon={<SyncOutlinedIcon />} variant="contained" onClick={handleSync} disabled={busy}>
                Sync and scan
              </Button>
            ) : (
              <Button
                startIcon={<SettingsOutlinedIcon />}
                variant="contained"
                onClick={() => navigate('/settings')}
                disabled={busy}
              >
                Open settings
              </Button>
            )}
          </Stack>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}
        >
          {[
            ['Mail accounts', status?.counts?.mailAccountsCount ?? 0],
            ['Synced emails', status?.counts?.emailsCount ?? 0],
            ['Scans', status?.counts?.scansCount ?? 0],
          ].map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h4" fontWeight={900}>
                {value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {syncResult ? (
          <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={800}>
              Last sync
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fetched {syncResult.fetchedCount} messages, inserted {syncResult.insertedCount}, updated{' '}
              {syncResult.updatedCount}. Scanned {syncResult.scanSummary?.scannedCount ?? 0}.
            </Typography>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
