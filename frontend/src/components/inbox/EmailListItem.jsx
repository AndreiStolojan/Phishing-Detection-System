import { Box, ButtonBase, Typography } from '@mui/material';

import RiskBadge from '../security/RiskBadge.jsx';
import { formatDateTime } from '../../utils/formatDate.js';

export default function EmailListItem({ email, selected, onSelect }) {
  return (
    <ButtonBase
      onClick={() => onSelect(email)}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: selected ? 'rgba(138, 180, 248, 0.10)' : 'background.paper',
        '&:hover': {
          bgcolor: selected ? 'rgba(138, 180, 248, 0.14)' : 'rgba(255,255,255,0.04)',
        },
        '&:focus-visible': {
          outline: '2px solid #8ab4f8',
          outlineOffset: -2,
        },
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px, 220px) minmax(0, 1fr) auto' },
            gap: { xs: 0.75, sm: 1.5 },
            alignItems: 'start',
          }}
        >
          <Typography variant="body2" color="text.primary" fontWeight={700} noWrap>
            {email.displayName || email.from || 'Unknown sender'}
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap>
              {email.subject || '(No subject)'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {email.snippet || 'No preview available.'}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'row', sm: 'column' },
              alignItems: { xs: 'center', sm: 'flex-end' },
              justifyContent: 'space-between',
              gap: 0.75,
              minWidth: { sm: 132 },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {formatDateTime(email.receivedAt)}
            </Typography>
            <RiskBadge riskBucket={email.riskBucket} />
          </Box>
        </Box>
      </Box>
    </ButtonBase>
  );
}
