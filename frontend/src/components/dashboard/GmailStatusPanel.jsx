import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';
import { motion } from 'framer-motion';

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDateTime = (value) => {
  if (!value) {
    return 'Niciodata';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Data necunoscuta';
  }

  return dateFormatter.format(date);
};

const getSyncErrorText = (syncError) => {
  if (typeof syncError === 'string') {
    return syncError;
  }

  if (!syncError || typeof syncError !== 'object') {
    return 'Eroare de sync necunoscuta.';
  }

  return syncError.message
    || syncError.error
    || syncError.reason
    || JSON.stringify(syncError);
};

const syncSourceLabels = {
  gmail_initial_sync: 'Prima sincronizare Gmail',
  gmail_manual_sync: 'Sincronizare manuala Gmail',
  gmail_scheduled_sync: 'Sincronizare programata Gmail',
  gmail_resync: 'Resincronizare Gmail',
};

const scanSummaryLabels = {
  insertedCandidatesCount: 'Emailuri noi eligibile',
  updatedCandidatesCount: 'Emailuri actualizate eligibile',
  scannedCount: 'Scanate automat',
  scannedInsertedCount: 'Emailuri noi scanate',
  scannedUpdatedCount: 'Emailuri actualizate scanate',
  skippedCount: 'Sarite',
  skippedAlreadyCurrentCount: 'Deja la zi',
  skippedReviewedCount: 'Revizuite manual',
  failedCount: 'Esuate',
};

const accountStatusLabels = {
  active: 'activ',
  disconnected: 'deconectat',
  expired: 'token expirat',
  error: 'eroare',
  pending: 'in asteptare',
  revoked: 'acces revocat',
};

const formatTechnicalLabel = (value) => {
  if (!value) {
    return 'necunoscut';
  }

  const normalized = String(value)
    .replaceAll('_', ' ')
    .toLowerCase();

  return normalized.replace(/\bgmail\b/g, 'Gmail');
};

const getSyncSourceLabel = (source) => syncSourceLabels[source] || formatTechnicalLabel(source);

const getScanSummaryLabel = (key) => scanSummaryLabels[key] || formatTechnicalLabel(key);

const formatSyncSummaryValue = (value) => {
  if (typeof value === 'boolean') {
    return value ? 'da' : 'nu';
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return value;
};

const getScanSummaryItems = (scanSummary) => {
  if (!scanSummary || typeof scanSummary !== 'object' || Array.isArray(scanSummary)) {
    return [];
  }

  return Object.entries(scanSummary)
    .filter(([, value]) => (
      value === null
      || ['string', 'number', 'boolean'].includes(typeof value)
    ))
    .map(([key, value]) => ({
      key,
      label: getScanSummaryLabel(key),
      value: formatSyncSummaryValue(value),
    }));
};

const getAccountStatusLabel = (status) => {
  if (!status) {
    return 'status necunoscut';
  }

  return accountStatusLabels[status] || formatTechnicalLabel(status);
};

const SyncMetric = ({ label, value, color = 'text.primary' }) => (
  <Box
    sx={{
      border: '1px solid rgba(148, 163, 184, 0.12)',
      borderRadius: 1.5,
      px: 1.5,
      py: 1.25,
      bgcolor: 'rgba(2, 6, 23, 0.26)',
      minWidth: 0,
    }}
  >
    <Typography variant="caption" color="text.secondary" fontWeight={800}>
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={900} color={color} lineHeight={1.15}>
      {formatSyncSummaryValue(value)}
    </Typography>
  </Box>
);

const GmailStatusPanel = ({
  gmailAccount,
  hasGmailConnected,
  isLoading = false,
  isConnectLoading = false,
  isSyncLoading = false,
  syncResult = null,
  error = null,
  onConnect,
  onSync,
  reviewQueueCount = 0,
  confirmedPhishingCount = 0,
  likelyPhishingQueueCount = 0,
}) => {
  const isActive = gmailAccount?.status === 'active';
  const statusLabel = hasGmailConnected ? 'Gmail conectat' : 'Gmail neconectat';
  const statusSeverity = hasGmailConnected ? 'success' : 'warning';
  const syncErrors = Array.isArray(syncResult?.syncErrors) ? syncResult.syncErrors : [];
  const scanSummaryItems = getScanSummaryItems(syncResult?.scanSummary);
  const canSync = Boolean(gmailAccount?._id && isActive);
  const hasReviewQueue = Number(reviewQueueCount) > 0;
  const hasConfirmedPhishing = Number(confirmedPhishingCount) > 0;
  const syncMetricItems = syncResult ? [
    ['Citite din Gmail', syncResult.fetchedCount ?? 0, 'primary.main'],
    ['Noi salvate', syncResult.insertedCount ?? 0, 'success.main'],
    ['Actualizate', syncResult.updatedCount ?? 0, 'secondary.main'],
    ['Sarite', syncResult.skippedCount ?? 0, 'warning.main'],
  ] : [];

  return (
    <Paper
      component={motion.section}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      elevation={0}
      sx={{
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 2,
        p: { xs: 2.5, sm: 3 },
        background:
          'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.84) 100%)',
        boxShadow: '0 22px 70px rgba(2, 6, 23, 0.22)',
      }}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  color: hasGmailConnected ? 'success.main' : 'warning.main',
                  backgroundColor: 'rgba(148, 163, 184, 0.09)',
                }}
              >
                  <MarkEmailReadRounded fontSize="small" />
                </Box>
              <Box>
                <Typography component="h2" variant="h6" fontWeight={900}>
                  Scanare Gmail
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rulează sincronizarea; backend-ul salvează emailurile și pornește scanarea automată.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Chip
            color={statusSeverity}
            variant={hasGmailConnected ? 'filled' : 'outlined'}
            label={statusLabel}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 800 }}
          />
        </Stack>

        {error && (
          <Alert severity="error" icon={<ErrorOutlineRounded fontSize="inherit" />}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.35fr 1fr' },
            gap: 2,
          }}
        >
          <Box
            sx={{
              border: '1px solid rgba(148, 163, 184, 0.14)',
              borderRadius: 2,
              p: 2,
              backgroundColor: 'rgba(2, 6, 23, 0.28)',
            }}
          >
            {gmailAccount ? (
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleRounded
                    fontSize="small"
                    color={isActive ? 'success' : 'warning'}
                  />
                  <Typography variant="body2" color="text.secondary" fontWeight={800}>
                    Cont Gmail
                  </Typography>
                </Stack>
                <Typography variant="h6" fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
                  {gmailAccount.accountEmail || 'Email necunoscut'}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={`Provider: ${gmailAccount.provider || 'google'}`} />
                  <Chip
                    size="small"
                    color={isActive ? 'success' : 'warning'}
                    label={`Status: ${getAccountStatusLabel(gmailAccount.status)}`}
                  />
                  <Chip
                    size="small"
                    label={`Sync max: ${gmailAccount.syncMaxResults ?? '-'}`}
                  />
                </Stack>
                <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.14)' }} />
                <Typography variant="body2" color="text.secondary">
                  Ultimul sync: {formatDateTime(gmailAccount.lastSyncedAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expirare token: {formatDateTime(gmailAccount.tokenExpiryDate)}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.2}>
                <Typography variant="h6" fontWeight={900}>
                  Conecteaza Gmail ca prim pas.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fara un cont Gmail activ, dashboardul nu are emailuri reale de sincronizat si scanat.
                </Typography>
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              border: '1px solid rgba(148, 163, 184, 0.14)',
              borderRadius: 2,
              p: 2,
              backgroundColor: 'rgba(2, 6, 23, 0.28)',
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" fontWeight={800}>
                Acțiune principală
              </Typography>
              {hasGmailConnected ? (
                <Button
                  variant={canSync ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={isSyncLoading ? <CircularProgress size={16} color="inherit" /> : <SyncRounded />}
                  onClick={onSync}
                  disabled={isLoading || isConnectLoading || isSyncLoading || !canSync}
                  fullWidth
                  size="large"
                >
                  {isSyncLoading ? 'Se sincronizeaza si se scaneaza...' : 'Sincronizeaza si scaneaza'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isConnectLoading ? <CircularProgress size={16} color="inherit" /> : <LinkRounded />}
                  onClick={onConnect}
                  disabled={isLoading || isConnectLoading || isSyncLoading}
                  fullWidth
                  size="large"
                >
                  {isConnectLoading ? 'Se deschide conectarea...' : 'Conecteaza Gmail'}
                </Button>
              )}
              {!canSync && gmailAccount && (
                <Typography variant="caption" color="text.secondary">
                  Sync-ul este disponibil doar pentru un cont Gmail cu status activ.
                </Typography>
              )}
              {!hasGmailConnected && (
                <Typography variant="caption" color="text.secondary">
                  Dupa conectare, revino aici pentru sincronizare si scanare.
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>

        {syncResult && (
          <Alert
            severity={syncErrors.length > 0 || hasReviewQueue ? 'warning' : 'success'}
            variant="outlined"
            sx={{
              borderColor: syncErrors.length > 0 || hasReviewQueue
                ? 'rgba(245, 158, 11, 0.34)'
                : 'rgba(74, 222, 128, 0.34)',
              bgcolor: syncErrors.length > 0 || hasReviewQueue
                ? 'rgba(120, 53, 15, 0.16)'
                : 'rgba(20, 83, 45, 0.16)',
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography fontWeight={900}>Scanarea s-a terminat</Typography>
                <Typography variant="body2">
                  {hasReviewQueue
                    ? `Ai ${reviewQueueCount} emailuri de verificat manual.`
                    : 'Nu există emailuri noi în coada de verificare.'}
                </Typography>
                <Typography variant="body2">
                  {hasConfirmedPhishing
                    ? `${confirmedPhishingCount} emailuri sunt deja confirmate ca phishing.`
                    : 'Emailurile confirmate ca phishing vor apărea separat după review manual.'}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                <SyncMetric
                  label="De verificat"
                  value={reviewQueueCount}
                  color={hasReviewQueue ? 'warning.main' : 'success.main'}
                />
                <SyncMetric
                  label="Probabil phishing"
                  value={likelyPhishingQueueCount}
                  color={likelyPhishingQueueCount > 0 ? 'error.main' : 'success.main'}
                />
                <SyncMetric
                  label="Confirmate phishing"
                  value={confirmedPhishingCount}
                  color={hasConfirmedPhishing ? 'error.main' : 'text.primary'}
                />
              </Box>

              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.14)' }} />

              <Box>
                <Typography fontWeight={900}>Detalii tehnice ultima rulare</Typography>
                <Typography variant="body2">
                  Tip rulare: {getSyncSourceLabel(syncResult.syncSource)}
                </Typography>
                <Typography variant="body2">
                  Finalizată la: {formatDateTime(syncResult.syncedAt)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                {syncMetricItems.map(([label, value, color]) => (
                  <SyncMetric key={label} label={label} value={value} color={color} />
                ))}
              </Box>

              {scanSummaryItems.length > 0 && (
                <Box>
                  <Typography variant="body2" fontWeight={900}>
                    Detalii scanare
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {scanSummaryItems.map((item) => (
                      <Chip
                        key={item.key}
                        size="small"
                        label={`${item.label}: ${item.value}`}
                        sx={{
                          borderRadius: 1,
                          bgcolor: 'rgba(148, 163, 184, 0.1)',
                          color: 'text.secondary',
                          fontWeight: 800,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {syncErrors.length > 0 && (
                <Box>
                  <Typography variant="body2" fontWeight={800}>
                    Erori sync
                  </Typography>
                  <List dense disablePadding>
                    {syncErrors.map((syncError, index) => (
                      <ListItem key={`${getSyncErrorText(syncError)}-${index}`} disableGutters sx={{ py: 0 }}>
                        <ListItemText
                          primary={getSyncErrorText(syncError)}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};

export default GmailStatusPanel;
