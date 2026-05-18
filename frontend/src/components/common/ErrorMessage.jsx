import { Alert, AlertTitle, Button } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

const getDetailsMessage = (details) => {
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

export const getErrorMessage = (error) => {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  const data = error?.response?.data || error?.data || error?.payload || error;
  const detailsMessage = getDetailsMessage(data?.details || data?.errors || error?.errors);

  return (
    detailsMessage ||
    data?.message ||
    error?.message ||
    'A aparut o eroare la comunicarea cu serverul.'
  );
};

export const ErrorMessage = ({
  message,
  error,
  onRetry,
  retryLabel = 'Incearca din nou',
  title,
  sx,
}) => {
  const readableMessage =
    message || getErrorMessage(error) || 'A aparut o eroare la comunicarea cu serverul.';

  return (
    <Alert
      severity="error"
      variant="outlined"
      action={
        onRetry ? (
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshRoundedIcon fontSize="small" />}
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        ) : null
      }
      sx={{
        alignItems: 'center',
        borderColor: 'rgba(251, 113, 133, 0.34)',
        background:
          'linear-gradient(180deg, rgba(127, 29, 29, 0.22), rgba(76, 5, 25, 0.12))',
        color: 'error.main',
        boxShadow: '0 16px 38px rgba(76, 5, 25, 0.18)',
        whiteSpace: 'pre-line',
        '& .MuiAlert-icon': {
          color: 'error.main',
        },
        '& .MuiAlert-message': {
          minWidth: 0,
        },
        '& .MuiAlert-action': {
          ml: 2,
          pl: 0,
        },
        ...sx,
      }}
    >
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {readableMessage}
    </Alert>
  );
};

export default ErrorMessage;
