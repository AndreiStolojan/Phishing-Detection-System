import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { markEmailPhishing, markEmailSafe } from '../api/actionsApi.js';
import { getEmail, getEmailRaw } from '../api/emailsApi.js';
import { scanEmail } from '../api/scansApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import EmailBody from '../components/inbox/EmailBody.jsx';
import ReviewActions from '../components/security/ReviewActions.jsx';
import RiskBadge from '../components/security/RiskBadge.jsx';
import ScanSummary from '../components/security/ScanSummary.jsx';
import { formatDateTime } from '../utils/formatDate.js';

const MetaLine = ({ label, value }) =>
  value ? (
    <Typography variant="body2" color="text.secondary">
      <Typography component="span" variant="body2" color="text.primary" fontWeight={700}>
        {label}:
      </Typography>{' '}
      {value}
    </Typography>
  ) : null;

export default function EmailDetailPage() {
  const { emailId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [rawEmail, setRawEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadEmail = useCallback(async () => {
    setLoading(true);
    setRawLoading(true);
    setError(null);
    setActionError(null);

    try {
      setEmail(await getEmail(emailId));
    } catch (err) {
      setEmail(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }

    try {
      setRawEmail(await getEmailRaw(emailId));
    } catch (err) {
      setRawEmail(null);
      setError(err.message);
    } finally {
      setRawLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    loadEmail();
  }, [loadEmail]);

  const runActionAndRefresh = async (action) => {
    if (!email?._id) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      await action(email._id);
      await loadEmail();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/inbox');
  };

  if (loading && !email) {
    return <LoadingState label="Loading email detail" />;
  }

  return (
    <Box sx={{ minHeight: '100%', px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 3 } }}>
      <Stack spacing={2} sx={{ maxWidth: 1040, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Back to inbox">
            <IconButton onClick={handleBack} aria-label="Back to inbox">
              <ArrowBackOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Button onClick={handleBack} color="inherit">
            Inbox
          </Button>
        </Box>

        <ErrorMessage message={error || actionError} />

        {!email && !loading ? (
          <EmptyState title="Email not found" description="Go back to the inbox and choose another message." />
        ) : null}

        {email ? (
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: 'divider' }}>
            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
                    {email.subject || '(No subject)'}
                  </Typography>
                  <Stack spacing={0.35} sx={{ mt: 1.5 }}>
                    <MetaLine label="From" value={email.from} />
                    <MetaLine label="To" value={email.to} />
                    <MetaLine label="Reply-To" value={email.replyTo} />
                    <MetaLine label="Received" value={formatDateTime(email.receivedAt)} />
                    <MetaLine label="Message ID" value={email.messageId} />
                  </Stack>
                </Box>
                <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'flex-start' } }}>
                  <RiskBadge riskBucket={email.riskBucket} />
                </Box>
              </Stack>
            </Box>

            <ReviewActions
              loading={actionLoading}
              onMarkSafe={() => runActionAndRefresh(markEmailSafe)}
              onMarkPhishing={() => runActionAndRefresh(markEmailPhishing)}
              onRescan={() => runActionAndRefresh(scanEmail)}
            />
            <ScanSummary scan={email.latestScan} />

            <Box sx={{ p: { xs: 2, md: 2.5 }, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Message body
              </Typography>
              <Typography variant="caption" color="text.secondary">
                HTML is sanitized before rendering.
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ minHeight: 320, bgcolor: 'background.default' }}>
              {rawLoading ? <LoadingState label="Loading message body" /> : <EmailBody rawEmail={rawEmail} />}
            </Box>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
