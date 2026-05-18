import { Box, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const StatCard = ({
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
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, ease: 'easeOut' }}
    elevation={0}
    sx={{
      height: '100%',
      minHeight: 148,
      border: '1px solid rgba(148, 163, 184, 0.18)',
      borderRadius: 2,
      p: 2.5,
      background:
        'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.82) 100%)',
      boxShadow: '0 20px 60px rgba(2, 6, 23, 0.24)',
      overflow: 'hidden',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: '0 0 auto',
        height: 3,
        bgcolor: accentColor,
        opacity: 0.8,
      },
    }}
  >
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              {eyebrow}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary" fontWeight={800} noWrap>
            {title}
          </Typography>
        </Box>
        {icon && (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              color: accentColor,
              backgroundColor: 'rgba(148, 163, 184, 0.09)',
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>

      <Box sx={{ mt: 'auto' }}>
        {isLoading ? (
          <Skeleton variant="text" width={96} height={48} />
        ) : (
          <Typography variant="h3" component="p" fontWeight={900} lineHeight={1}>
            {value}
          </Typography>
        )}
        {typeof progress === 'number' ? (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(progress, 100))}
            sx={{
              mt: 1.5,
              height: 6,
              borderRadius: 999,
              bgcolor: 'rgba(148, 163, 184, 0.12)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                bgcolor: accentColor,
              },
            }}
          />
        ) : null}
        {helper && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {helper}
          </Typography>
        )}
      </Box>
    </Stack>
  </Paper>
);

export default StatCard;
