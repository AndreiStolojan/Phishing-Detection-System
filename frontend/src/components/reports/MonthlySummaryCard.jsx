import { Box, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const numberFormatter = new Intl.NumberFormat('ro-RO');

const formatCount = (value) => {
  const numericValue = Number(value ?? 0);

  return numberFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
};

const MonthlySummaryCard = ({
  title,
  value,
  helper,
  icon,
  accentColor = 'primary.main',
  progress,
  eyebrow,
  isLoading = false,
}) => (
  <Paper
    component={motion.div}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3 }}
    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    elevation={0}
    sx={{
      height: '100%',
      minHeight: 138,
      border: '1px solid rgba(148, 163, 184, 0.18)',
      borderRadius: 2,
      p: 2,
      background:
        'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.8) 100%)',
      boxShadow: '0 18px 54px rgba(2, 6, 23, 0.2)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: '0 0 auto',
        height: 3,
        bgcolor: accentColor,
        opacity: 0.78,
      },
    }}
  >
    <Stack spacing={1.5} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              {eyebrow}
            </Typography>
          ) : null}
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={800}
            sx={{ overflowWrap: 'anywhere' }}
          >
            {title}
          </Typography>
        </Box>

        {icon ? (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              color: accentColor,
              backgroundColor: 'rgba(148, 163, 184, 0.09)',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        ) : null}
      </Stack>

      <Box sx={{ mt: 'auto' }}>
        {isLoading ? (
          <Skeleton variant="text" width={86} height={42} />
        ) : (
          <Typography variant="h4" component="p" fontWeight={900} lineHeight={1.05}>
            {formatCount(value)}
          </Typography>
        )}

        {typeof progress === 'number' ? (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(progress, 100))}
            sx={{
              mt: 1.25,
              height: 5,
              borderRadius: 999,
              bgcolor: 'rgba(148, 163, 184, 0.12)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                bgcolor: accentColor,
              },
            }}
          />
        ) : null}

        {helper ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {helper}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
);

export default MonthlySummaryCard;
