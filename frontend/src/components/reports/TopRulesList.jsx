import { Box, Stack, Typography } from '@mui/material';

export default function TopRulesList({ rules = [] }) {
  if (rules.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No triggered rules for this period.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {rules.map((rule) => (
        <Box
          key={rule.rule}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            p: 1.25,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {rule.rule}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rule.count} hits
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {rule.totalPoints} pts
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
