import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingState({ label = 'Loading' }) {
  return (
    <Box
      sx={{
        minHeight: 160,
        display: 'grid',
        placeItems: 'center',
        gap: 1,
        color: 'text.secondary',
      }}
    >
      <CircularProgress size={26} />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}
