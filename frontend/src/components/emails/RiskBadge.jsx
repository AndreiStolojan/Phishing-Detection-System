import { Chip } from '@mui/material';

import { getRiskBucketMeta } from '../../utils/formatRisk.js';

const toneStyles = {
  neutral: {
    color: '#cbd5e1',
    borderColor: 'rgba(203, 213, 225, 0.32)',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  success: {
    color: '#86efac',
    borderColor: 'rgba(74, 222, 128, 0.4)',
    backgroundColor: 'rgba(22, 101, 52, 0.18)',
  },
  successStrong: {
    color: '#bbf7d0',
    borderColor: 'rgba(34, 197, 94, 0.55)',
    backgroundColor: 'rgba(21, 128, 61, 0.28)',
  },
  warning: {
    color: '#fcd34d',
    borderColor: 'rgba(245, 158, 11, 0.48)',
    backgroundColor: 'rgba(146, 64, 14, 0.24)',
  },
  error: {
    color: '#fca5a5',
    borderColor: 'rgba(248, 113, 113, 0.52)',
    backgroundColor: 'rgba(127, 29, 29, 0.24)',
  },
  dangerStrong: {
    color: '#fecaca',
    borderColor: 'rgba(239, 68, 68, 0.62)',
    backgroundColor: 'rgba(153, 27, 27, 0.32)',
  },
  muted: {
    color: '#94a3b8',
    borderColor: 'rgba(148, 163, 184, 0.26)',
    backgroundColor: 'rgba(51, 65, 85, 0.22)',
  },
};

const RiskBadge = ({
  riskBucket,
  compact = false,
  sx,
}) => {
  const meta = getRiskBucketMeta(riskBucket);
  const styles = toneStyles[meta.tone] || toneStyles.muted;

  return (
    <Chip
      label={compact ? meta.shortLabel : meta.label}
      size="small"
      variant="outlined"
      sx={{
        width: 'fit-content',
        maxWidth: '100%',
        fontWeight: 800,
        ...styles,
        '& .MuiChip-label': {
          px: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        ...sx,
      }}
    />
  );
};

export default RiskBadge;
