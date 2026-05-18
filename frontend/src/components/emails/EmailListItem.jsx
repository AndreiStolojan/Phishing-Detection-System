import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { formatDateTime } from '../../utils/formatDate.js';
import {
  formatReviewStatus,
  formatRiskScore,
  formatVerdict,
  formatVerdictSource,
} from '../../utils/formatRisk.js';
import RiskBadge from './RiskBadge.jsx';

const getSenderLabel = (email) => (
  email.displayName || email.from || 'Expeditor necunoscut'
);

const getSenderDetails = (email) => {
  if (email.displayName && email.from) {
    return email.from;
  }

  return email.senderDomain || 'Domeniu necunoscut';
};

const EmailListItem = ({ email }) => {
  const emailId = email?._id;
  const scan = email?.latestScan ?? null;
  const detailPath = emailId ? `/emails/${encodeURIComponent(emailId)}` : '/emails';
  const subject = email?.subject?.trim() || '(Fara subiect)';
  const snippet = email?.snippet?.trim() || 'Fara fragment disponibil.';
  const scoreLabel = formatRiskScore(scan?.score);
  const verdictLabel = formatVerdict(email?.effectiveVerdict);
  const sourceLabel = formatVerdictSource(email?.verdictSource);

  return (
    <Box
      component={RouterLink}
      to={detailPath}
      sx={{
        display: 'block',
        color: 'text.primary',
        textDecoration: 'none',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 1,
        bgcolor: 'rgba(15, 23, 42, 0.74)',
        px: { xs: 2, sm: 2.5 },
        py: 2,
        transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
        '&:hover': {
          borderColor: 'rgba(56, 189, 248, 0.42)',
          bgcolor: 'rgba(15, 23, 42, 0.96)',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '2px solid rgba(56, 189, 248, 0.7)',
          outlineOffset: 2,
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h2"
              variant="subtitle1"
              fontWeight={800}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
              }}
            >
              {subject}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
              }}
            >
              {getSenderLabel(email)}
              {' '}
              <Box component="span" sx={{ color: 'rgba(148, 163, 184, 0.75)' }}>
                {getSenderDetails(email)}
              </Box>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <RiskBadge riskBucket={email?.riskBucket} compact />
            <Chip
              label={scoreLabel}
              size="small"
              variant="outlined"
              sx={{
                color: 'text.primary',
                borderColor: 'rgba(148, 163, 184, 0.28)',
                bgcolor: 'rgba(2, 6, 23, 0.32)',
                fontWeight: 800,
              }}
            />
          </Stack>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.6,
          }}
        >
          {snippet}
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.75, sm: 2 }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              Verdict: {verdictLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sursa: {sourceLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review: {formatReviewStatus(email?.reviewStatus)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center" color="text.secondary">
            <Typography variant="caption">
              {formatDateTime(email?.receivedAt)}
            </Typography>
            <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default EmailListItem;
