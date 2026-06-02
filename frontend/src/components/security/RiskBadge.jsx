import { Chip } from '@mui/material';

import { formatRiskBucket } from '../../utils/formatRisk.js';

export default function RiskBadge({ riskBucket }) {
  const config = formatRiskBucket(riskBucket);

  return (
    <Chip
      size="small"
      label={config.label}
      color={config.severity === 'default' ? undefined : config.severity}
      variant={config.severity === 'default' ? 'outlined' : 'filled'}
      sx={{
        borderColor: config.severity === 'default' ? 'divider' : undefined,
        color: config.severity === 'default' ? 'text.secondary' : undefined,
      }}
    />
  );
}
