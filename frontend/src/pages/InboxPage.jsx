import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getEmails } from '../api/emailsApi.js';
import { getMailAccounts, syncMailAccount } from '../api/mailAccountsApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmailList from '../components/inbox/EmailList.jsx';
import { RISK_BUCKETS } from '../utils/formatRisk.js';

export default function InboxPage() {
  const navigate = useNavigate();
  const [riskBucket, setRiskBucket] = useState('');
  const [search, setSearch] = useState('');
  const [emails, setEmails] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [checkingMail, setCheckingMail] = useState(false);
  const [listError, setListError] = useState(null);
  const [accountError, setAccountError] = useState(null);
  const [mailStatus, setMailStatus] = useState(null);

  const activeGmailAccount = useMemo(
    () => accounts.find((account) => account.provider === 'gmail' && account.status === 'active'),
    [accounts]
  );

  const loadEmails = useCallback(async () => {
    setLoadingList(true);
    setListError(null);

    try {
      const result = await getEmails({
        page: 1,
        limit: 40,
        q: search,
        riskBucket,
      });
      setEmails(result.items || []);
    } catch (error) {
      setListError(error.message);
    } finally {
      setLoadingList(false);
    }
  }, [riskBucket, search]);

  const loadAccounts = useCallback(async () => {
    setAccountError(null);

    try {
      setAccounts(await getMailAccounts());
    } catch (error) {
      setAccountError(error.message);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCheckMail = async () => {
    if (!activeGmailAccount) {
      navigate('/settings');
      return;
    }

    setCheckingMail(true);
    setAccountError(null);
    setMailStatus(null);

    try {
      await syncMailAccount(activeGmailAccount._id);
      await Promise.all([loadAccounts(), loadEmails()]);
      setMailStatus('Updated just now');
    } catch (error) {
      setAccountError(error.message);
    } finally {
      setCheckingMail(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100%', px: { xs: 1, md: 2 }, py: { xs: 1, md: 1.5 } }}>
      <Stack spacing={1.5} sx={{ width: '100%', minHeight: { md: 'calc(100vh - 24px)' } }}>
        <ErrorMessage message={accountError || listError} />

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1, md: 1.25 },
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={1.25}>
            <ToggleButtonGroup
              value={riskBucket}
              exclusive
              onChange={(_, nextBucket) => {
                if (nextBucket !== null) {
                  setRiskBucket(nextBucket);
                }
              }}
              size="small"
              aria-label="Security filter"
              sx={{
                maxWidth: '100%',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 0.75,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mx: 0,
                },
              }}
            >
              {RISK_BUCKETS.map((bucket) => (
                <ToggleButton key={bucket.key || 'all'} value={bucket.key} aria-label={bucket.label}>
                  {bucket.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1 }}>
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mail"
                size="small"
                fullWidth
                inputProps={{ 'aria-label': 'Search mail' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title={activeGmailAccount ? 'Check for new mail' : 'Connect Gmail in Settings'}>
                <IconButton
                  onClick={handleCheckMail}
                  disabled={checkingMail}
                  aria-label={activeGmailAccount ? 'Check for new mail' : 'Connect Gmail in Settings'}
                  sx={{
                    width: 40,
                    height: 40,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.default',
                    '&:hover': {
                      bgcolor: 'rgba(138, 180, 248, 0.10)',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  {checkingMail ? (
                    <CircularProgress size={18} />
                  ) : activeGmailAccount ? (
                    <RefreshOutlinedIcon />
                  ) : (
                    <SettingsOutlinedIcon />
                  )}
                </IconButton>
              </Tooltip>
            </Box>

            {mailStatus ? (
              <Typography variant="caption" color="success.main" sx={{ px: 0.5 }}>
                {mailStatus}
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            overflow: 'hidden',
            borderColor: 'divider',
            minHeight: { xs: 360, md: 0 },
          }}
        >
          <EmailList
            emails={emails}
            loading={loadingList}
            onSelectEmail={(email) => navigate(`/emails/${email._id}`)}
          />
          {!loadingList && emails.length === 0 ? (
            <EmptyState
              title={activeGmailAccount ? 'No email found' : 'No mail yet'}
              description={
                activeGmailAccount
                  ? 'Try a different filter or check for new mail.'
                  : 'Open Settings to connect Gmail and bring messages into SecureInbox.'
              }
            />
          ) : null}
        </Paper>
      </Stack>
    </Box>
  );
}
