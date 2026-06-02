import { Alert } from '@mui/material';

export default function ErrorMessage({ message }) {
  if (!message) {
    return null;
  }

  return (
    <Alert severity="error" variant="outlined" sx={{ borderRadius: 1 }}>
      {message}
    </Alert>
  );
}
