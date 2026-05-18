import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import OutboxRoundedIcon from '@mui/icons-material/OutboxRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';

const dateTimeFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'data necunoscuta' : dateTimeFormatter.format(date);
};

const getStatusMeta = (status) => {
  if (status === 'sending') {
    return {
      label: 'Se trimite',
      color: 'primary',
      icon: <CircularProgress size={18} color="inherit" />,
      toneColor: '#38bdf8',
    };
  }

  if (status === 'sent') {
    return {
      label: 'Trimis',
      color: 'success',
      icon: <MarkEmailReadRoundedIcon fontSize="small" />,
      toneColor: '#4ade80',
    };
  }

  if (status === 'failed') {
    return {
      label: 'Eroare',
      color: 'error',
      icon: <ErrorOutlineRoundedIcon fontSize="small" />,
      toneColor: '#f87171',
    };
  }

  return {
    label: 'Pregatit',
    color: 'default',
    icon: <SendRoundedIcon fontSize="small" />,
    toneColor: '#94a3b8',
  };
};

const getErrorObject = ({ result, error }) => {
  const payloadResult = error?.payload?.data
    || error?.data?.data
    || error?.response?.data?.data
    || null;

  return result?.error || payloadResult?.error || error?.error || null;
};

const getFallbackErrorMessage = (error) => {
  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return error;
  }

  return error?.message || 'Digestul nu a putut fi trimis.';
};

const DetailRow = ({ label, value, strong = false }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={{ xs: 0.35, sm: 1.5 }}
    justifyContent="space-between"
    sx={{
      borderBottom: '1px solid rgba(148, 163, 184, 0.11)',
      pb: 1,
      '&:last-of-type': {
        borderBottom: 0,
        pb: 0,
      },
    }}
  >
    <Typography variant="caption" color="text.secondary" fontWeight={800}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={strong ? 900 : 700}
      sx={{
        textAlign: { xs: 'left', sm: 'right' },
        overflowWrap: 'anywhere',
      }}
    >
      {value || '-'}
    </Typography>
  </Stack>
);

const ReportDeliveryStatus = ({
  status = 'idle',
  result = null,
  error = null,
  selectedMonth,
}) => {
  const meta = getStatusMeta(status);
  const errorObject = getErrorObject({ result, error });
  const fallbackErrorMessage = getFallbackErrorMessage(error);
  const recipient = result?.recipient
    || error?.payload?.data?.recipient
    || error?.data?.data?.recipient
    || error?.response?.data?.data?.recipient
    || null;
  const generatedAt = result?.generatedAt
    || error?.payload?.data?.generatedAt
    || error?.data?.data?.generatedAt
    || error?.response?.data?.data?.generatedAt
    || null;

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 2,
        p: { xs: 2, sm: 2.5 },
        background:
          'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.84) 100%)',
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                color: meta.toneColor,
                bgcolor: 'rgba(148, 163, 184, 0.09)',
                flexShrink: 0,
              }}
            >
              {meta.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h2" variant="h6" fontWeight={900}>
                Digest lunar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Statusul ultimei trimiteri manuale.
              </Typography>
            </Box>
          </Stack>

          <Chip
            size="small"
            color={meta.color}
            variant={status === 'idle' ? 'outlined' : 'filled'}
            label={meta.label}
            sx={{ fontWeight: 900, borderRadius: 1 }}
          />
        </Stack>

        {status === 'sending' ? (
          <Alert
            severity="info"
            variant="outlined"
            icon={<OutboxRoundedIcon fontSize="inherit" />}
            sx={{
              borderColor: 'rgba(56, 189, 248, 0.3)',
              bgcolor: 'rgba(14, 116, 144, 0.14)',
            }}
          >
            Se genereaza si se trimite digestul pentru luna {selectedMonth || '-'}.
          </Alert>
        ) : null}

        {status === 'failed' ? (
          <Alert
            severity="error"
            variant="outlined"
            sx={{
              borderColor: 'rgba(248, 113, 113, 0.36)',
              bgcolor: 'rgba(127, 29, 29, 0.18)',
            }}
          >
            {errorObject?.message || fallbackErrorMessage || 'Digestul nu a putut fi trimis.'}
          </Alert>
        ) : null}

        <Stack spacing={1}>
          <DetailRow label="Luna raportului" value={selectedMonth} />
          <DetailRow label="Destinatar" value={recipient} strong={status === 'sent'} />
          <DetailRow label="Message ID" value={result?.messageId} strong={status === 'sent'} />
          <DetailRow label="Generat la" value={formatDateTime(generatedAt)} />

          {status === 'failed' ? (
            <>
              <DetailRow label="Cod eroare" value={errorObject?.code || error?.code} />
              <DetailRow label="Detaliu" value={errorObject?.detail} />
              <DetailRow
                label="Config lipsa"
                value={Array.isArray(errorObject?.missing) ? errorObject.missing.join(', ') : null}
              />
            </>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ReportDeliveryStatus;
