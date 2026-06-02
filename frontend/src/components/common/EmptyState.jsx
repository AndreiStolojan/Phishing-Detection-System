import { Box, Typography } from '@mui/material';

export default function EmptyState({ title, description }) {
  return (
    <Box
      sx={{
        minHeight: 180,
        display: 'grid',
        alignContent: 'center',
        gap: 0.75,
        px: 3,
        color: 'text.secondary',
        textAlign: 'center',
      }}
    >
      <Typography variant="subtitle1" color="text.primary" fontWeight={700}>
        {title}
      </Typography>
      {description ? <Typography variant="body2">{description}</Typography> : null}
    </Box>
  );
}
