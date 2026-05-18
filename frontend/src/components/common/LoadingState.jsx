import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

export const LoadingState = ({
  message = 'Se incarca...',
  size = 22,
  thickness = 4,
  centered = true,
  minHeight = 96,
  sx,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Box
      component={motion.div}
      role="status"
      aria-live="polite"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      sx={{
        width: '100%',
        minHeight: centered ? minHeight : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: centered ? 'center' : 'flex-start',
        color: 'text.secondary',
        ...sx,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: 2,
          backgroundColor: 'rgba(13, 21, 36, 0.62)',
          border: '1px solid rgba(148, 163, 184, 0.14)',
        }}
      >
        <CircularProgress size={size} thickness={thickness} color="primary" />

        {message ? (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
};

export default LoadingState;
