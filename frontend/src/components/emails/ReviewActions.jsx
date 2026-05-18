import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';

import ErrorMessage from '../common/ErrorMessage.jsx';

const reviewStatusLabels = {
  reviewed: 'Revizuit manual',
  pending_review: 'Asteapta review',
  no_review_needed: 'Nu necesita review',
  unscanned: 'Nescanat',
};

const manualActionLabels = {
  mark_safe: 'Marcat sigur',
  mark_phishing: 'Marcat phishing',
};

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDateTime = (value) => {
  if (!value) {
    return 'inca nerevizuit';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'data necunoscuta' : dateFormatter.format(date);
};

const getProviderActionFromEmail = (email) => {
  if (!email?.lastProviderAction) {
    return null;
  }

  return {
    type: email.lastProviderAction,
    status: email.lastProviderActionStatus || 'unknown',
    message: email.lastProviderActionError?.message || '',
    errorCode: email.lastProviderActionError?.code || '',
    actedAt: email.lastProviderActionAt || null,
  };
};

const getProviderAlertProps = (providerAction) => {
  if (!providerAction) {
    return null;
  }

  if (providerAction.status === 'success') {
    return {
      severity: 'success',
      title: 'Actiune Gmail reusita',
      message: 'Emailul a fost mutat in Gmail Spam dupa confirmarea manuala.',
    };
  }

  if (providerAction.status === 'skipped') {
    return {
      severity: 'info',
      title: 'Actiune provider omisa',
      message:
        providerAction.message ||
        'Providerul nu a necesitat sau nu a suportat o actiune separata.',
    };
  }

  if (providerAction.status === 'failed') {
    return {
      severity: 'warning',
      title: 'Review local salvat; actiunea Gmail a esuat',
      message:
        providerAction.message ||
        'Backend-ul a salvat verdictul local, dar Gmail nu a acceptat mutarea in Spam.',
    };
  }

  return {
    severity: 'info',
    title: 'Status provider',
    message: providerAction.message || `Status provider: ${providerAction.status}`,
  };
};

const LoadingIcon = () => (
  <CircularProgress size={16} thickness={4} color="inherit" />
);

const ReviewActions = ({
  email,
  activeAction,
  actionError,
  actionFeedback,
  onMarkSafe,
  onMarkPhishing,
  onRescan,
}) => {
  const isBusy = Boolean(activeAction);
  const providerAction =
    actionFeedback?.providerAction || getProviderActionFromEmail(email);
  const providerAlert = getProviderAlertProps(providerAction);
  const isMarkSafeLoading = activeAction === 'mark_safe';
  const isMarkPhishingLoading = activeAction === 'mark_phishing';
  const isRescanLoading = activeAction === 'rescan';

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid rgba(148, 163, 184, 0.18)',
        bgcolor: 'rgba(15, 23, 42, 0.86)',
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              Actiuni manuale
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Review-ul manual are prioritate peste verdictul scanarii.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              label={reviewStatusLabels[email?.reviewStatus] || 'Status necunoscut'}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'rgba(148, 163, 184, 0.28)' }}
            />
            {email?.lastManualAction ? (
              <Chip
                label={manualActionLabels[email.lastManualAction] || email.lastManualAction}
                color={email.userVerdict === 'phishing' ? 'error' : 'success'}
                size="small"
              />
            ) : null}
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Verdict manual
            </Typography>
            <Typography variant="body2">
              {email?.userVerdict || 'fara verdict manual'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Revizuit la
            </Typography>
            <Typography variant="body2">
              {formatDateTime(email?.reviewedAt)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            variant="outlined"
            color="success"
            startIcon={isMarkSafeLoading ? <LoadingIcon /> : <CheckCircleRoundedIcon />}
            onClick={onMarkSafe}
            disabled={isBusy}
          >
            Marcheaza sigur
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={isMarkPhishingLoading ? <LoadingIcon /> : <ReportProblemRoundedIcon />}
            onClick={onMarkPhishing}
            disabled={isBusy}
          >
            Marcheaza phishing
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={isRescanLoading ? <LoadingIcon /> : <RefreshRoundedIcon />}
            onClick={onRescan}
            disabled={isBusy}
          >
            Rescan
          </Button>
        </Stack>

        {actionFeedback?.message ? (
          <Alert severity={actionFeedback.severity || 'success'} variant="outlined">
            {actionFeedback.message}
          </Alert>
        ) : null}

        {providerAlert ? (
          <Alert
            severity={providerAlert.severity}
            variant="outlined"
            sx={{
              borderColor:
                providerAlert.severity === 'warning'
                  ? 'rgba(245, 158, 11, 0.38)'
                  : undefined,
            }}
          >
            <AlertTitle>{providerAlert.title}</AlertTitle>
            {providerAlert.message}
            {providerAction?.errorCode ? (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>
                Cod: {providerAction.errorCode}
              </Typography>
            ) : null}
            {providerAction?.actedAt ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Raportat la {formatDateTime(providerAction.actedAt)}
              </Typography>
            ) : null}
          </Alert>
        ) : null}

        {actionError ? (
          <ErrorMessage
            error={actionError}
            title="Actiunea nu a putut fi finalizata"
          />
        ) : null}
      </Stack>
    </Paper>
  );
};

export default ReviewActions;
