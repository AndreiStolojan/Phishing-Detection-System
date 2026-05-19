import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import apiClient from '../api/apiClient.js';
import { markEmailPhishing, markEmailSafe } from '../api/actionsApi.js';
import { getLatestScanForEmail, rescanEmail } from '../api/scansApi.js';
import ErrorMessage, { getErrorMessage } from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import EmailDetailPanel from '../components/emails/EmailDetailPanel.jsx';
import ReviewActions from '../components/emails/ReviewActions.jsx';
import ScanSummary from '../components/emails/ScanSummary.jsx';

const encodeId = (id) => encodeURIComponent(id);

const getEmailDetailById = (emailId) => (
  apiClient.get(`/emails/${encodeId(emailId)}`)
);

const isScanNotFoundError = (error) => {
  const status = error?.statusCode || error?.status || error?.response?.status;
  const code = error?.code || error?.payload?.code || error?.data?.code;

  return status === 404 && (code === 'SCAN_NOT_FOUND' || /scan/i.test(error?.message || ''));
};

const getLatestScanOrNull = async (emailId) => {
  try {
    return await getLatestScanForEmail(emailId);
  } catch (error) {
    if (isScanNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const buildRefreshError = (error) => (
  `Actiunea a reusit, dar refresh-ul datelor a esuat: ${getErrorMessage(error)}`
);

const EmailDetailPage = () => {
  const { id } = useParams();
  const [email, setEmail] = useState(null);
  const [scan, setScan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const loadDetailData = useCallback(async ({ showPageLoader = true } = {}) => {
    if (!id) {
      const missingIdError = new Error('Lipseste id-ul emailului din ruta.');

      setLoadError(missingIdError);
      throw missingIdError;
    }

    if (showPageLoader) {
      setIsLoading(true);
    }

    setLoadError(null);

    try {
      const [nextEmail, nextScan] = await Promise.all([
        getEmailDetailById(id),
        getLatestScanOrNull(id),
      ]);
      const resolvedScan = nextScan || nextEmail?.latestScan || null;

      setEmail(nextEmail);
      setScan(resolvedScan);

      return {
        email: nextEmail,
        scan: resolvedScan,
      };
    } catch (error) {
      setLoadError(error);
      throw error;
    } finally {
      if (showPageLoader) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    setActionError(null);
    setActionFeedback(null);

    loadDetailData().catch(() => {
      // Error state is already stored by loadDetailData.
    });
  }, [loadDetailData]);

  const refreshAfterMutation = useCallback(async () => {
    try {
      await loadDetailData({ showPageLoader: false });
    } catch (error) {
      setActionError(buildRefreshError(error));
    }
  }, [loadDetailData]);

  const handleMarkSafe = useCallback(async () => {
    if (!id) {
      return;
    }

    setActiveAction('mark_safe');
    setActionError(null);
    setActionFeedback(null);

    try {
      const result = await markEmailSafe(id);

      setActionFeedback({
        type: 'mark_safe',
        message: 'Emailul a fost marcat local ca sigur.',
        result,
        severity: 'success',
      });
      await refreshAfterMutation();
    } catch (error) {
      setActionError(error);
    } finally {
      setActiveAction(null);
    }
  }, [id, refreshAfterMutation]);

  const handleMarkPhishing = useCallback(async () => {
    if (!id) {
      return;
    }

    setActiveAction('mark_phishing');
    setActionError(null);
    setActionFeedback(null);

    try {
      const result = await markEmailPhishing(id);

      setActionFeedback({
        type: 'mark_phishing',
        message:
          'Emailul a fost marcat local ca phishing. Statusul Gmail este afisat separat.',
        providerAction: result?.providerAction || null,
        result,
        severity: 'success',
      });
      await refreshAfterMutation();
    } catch (error) {
      setActionError(error);
    } finally {
      setActiveAction(null);
    }
  }, [id, refreshAfterMutation]);

  const handleRescan = useCallback(async () => {
    if (!id) {
      return;
    }

    setActiveAction('rescan');
    setActionError(null);
    setActionFeedback(null);

    try {
      const nextScan = await rescanEmail(id);

      setScan(nextScan || null);
      setActionFeedback({
        type: 'rescan',
        message: 'Scanarea manuala a fost refacuta.',
        result: nextScan,
        severity: 'success',
      });
      await refreshAfterMutation();
    } catch (error) {
      setActionError(error);
    } finally {
      setActiveAction(null);
    }
  }, [id, refreshAfterMutation]);

  const visibleScan = useMemo(
    () => scan || email?.latestScan || null,
    [email?.latestScan, scan]
  );

  if (isLoading && !email) {
    return (
      <Box sx={{ width: '100%' }}>
        <LoadingState message="Se incarca detaliul emailului..." minHeight={280} />
      </Box>
    );
  }

  if (loadError && !email) {
    return (
      <Box sx={{ width: '100%' }}>
        <Stack spacing={2}>
          <Button
            component={RouterLink}
            to="/emails"
            color="inherit"
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Inapoi la emailuri
          </Button>
          <ErrorMessage
            error={loadError}
            title="Detaliul emailului nu a putut fi incarcat"
            onRetry={() => loadDetailData().catch(() => {})}
          />
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Button
              component={RouterLink}
              to="/emails"
              color="inherit"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ mb: 1.5 }}
            >
              Inapoi la emailuri
            </Button>
            <Typography component="h1" variant="h4" fontWeight={800}>
              Analiza emailului
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
              {email?.subject || 'Fara subiect'}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            onClick={() => loadDetailData({ showPageLoader: false }).catch(() => {})}
            disabled={Boolean(activeAction)}
          >
            Reincarca
          </Button>
        </Stack>

        {loadError ? (
          <Alert severity="warning" variant="outlined">
            Datele sunt afisate din ultima incarcare reusita. Refresh-ul a esuat:
            {' '}
            {getErrorMessage(loadError)}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.45fr) minmax(360px, 0.85fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <EmailDetailPanel email={email} />

          <Stack spacing={2}>
            <ScanSummary scan={visibleScan} />

            <ReviewActions
              email={email}
              activeAction={activeAction}
              actionError={actionError}
              actionFeedback={actionFeedback}
              onMarkSafe={handleMarkSafe}
              onMarkPhishing={handleMarkPhishing}
              onRescan={handleRescan}
            />
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default EmailDetailPage;
