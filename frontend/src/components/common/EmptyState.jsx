import { Box, Stack, Typography } from '@mui/material';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import { motion, useReducedMotion } from 'framer-motion';

export const EmptyState = ({
  title = 'Nu exista date de afisat',
  description,
  action,
  icon = <InboxRoundedIcon fontSize="large" />,
  sx,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Box
      component={motion.div}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      sx={{
        width: '100%',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 2,
        background:
          'linear-gradient(180deg, rgba(13, 21, 36, 0.84), rgba(7, 12, 22, 0.72))',
        boxShadow: '0 18px 46px rgba(2, 6, 23, 0.22)',
        px: { xs: 2.5, sm: 3 },
        py: { xs: 3, sm: 4 },
        ...sx,
      }}
    >
      <Stack spacing={1.5} alignItems="center" textAlign="center">
        {icon ? (
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              background:
                'linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(52, 211, 153, 0.1))',
              border: '1px solid rgba(34, 211, 238, 0.2)',
              color: 'primary.light',
            }}
          >
            {icon}
          </Box>
        ) : null}

        <Box>
          <Typography component="h2" variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>

          {description ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, maxWidth: 520 }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>

        {action ? <Box sx={{ pt: 0.5 }}>{action}</Box> : null}
      </Stack>
    </Box>
  );
};

export default EmptyState;
