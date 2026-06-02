import { Box, Typography } from '@mui/material';

const countLabels = {
  syncedEmails: 'Synced',
  scannedEmails: 'Scanned',
  suspicious: 'Suspicious',
  likelyPhishing: 'Likely phishing',
  reviewed: 'Reviewed',
  markedPhishing: 'Marked phishing',
};

export default function MonthlySummaryCard({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {Object.entries(countLabels).map(([key, label]) => (
        <Box key={key} sx={{ p: 2, borderRight: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {summary.counts?.[key] ?? 0}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
