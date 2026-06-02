import { Box, Divider, Stack, Typography } from '@mui/material';

import { formatVerdict } from '../../utils/formatRisk.js';

const ScoreRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={700}>
      {value ?? 0}
    </Typography>
  </Box>
);

export default function ScanSummary({ scan }) {
  if (!scan) {
    return (
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={800}>
          Security scan
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          This email has no current scan.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" fontWeight={800}>
        Security scan
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
        <ScoreRow label="Verdict" value={formatVerdict(scan.verdict)} />
        <ScoreRow label="Final score" value={scan.score} />
        <ScoreRow label="Rule score" value={scan.ruleScore} />
        <ScoreRow label="AI score" value={scan.aiScore} />
      </Stack>
      {scan.aiExplanation?.summary ? (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            {scan.aiExplanation.summary}
          </Typography>
        </>
      ) : null}
    </Box>
  );
}
