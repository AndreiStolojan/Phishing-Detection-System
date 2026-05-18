import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import EmptyState from '../common/EmptyState.jsx';

const numberFormatter = new Intl.NumberFormat('ro-RO');

const formatNumber = (value) => {
  const numericValue = Number(value ?? 0);

  return numberFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
};

const getRuleName = (rule) => (
  rule?.rule || rule?.name || rule?.id || 'Regula necunoscuta'
);

const getRuleCount = (rule) => {
  const count = Number(rule?.count ?? 0);

  return Number.isFinite(count) ? count : 0;
};

const getRulePoints = (rule) => {
  const points = Number(rule?.totalPoints ?? 0);

  return Number.isFinite(points) ? points : 0;
};

const chartColors = ['#38bdf8', '#22c55e', '#f59e0b', '#f87171', '#a78bfa', '#14b8a6'];

const tooltipStyle = {
  background: 'rgba(15, 23, 42, 0.96)',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  borderRadius: 8,
  color: '#f8fafc',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)',
};

const tooltipLabelStyle = {
  color: '#cbd5e1',
  fontWeight: 800,
};

const TopRulesSkeleton = () => (
  <Stack spacing={2}>
    {[0, 1, 2].map((item) => (
      <Stack key={item} spacing={1}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="rounded" width={72} height={24} />
        </Stack>
        <Skeleton variant="rounded" height={6} />
      </Stack>
    ))}
  </Stack>
);

const TopRulesList = ({ rules = [], isLoading = false }) => {
  const safeRules = Array.isArray(rules) ? rules : [];
  const maxCount = Math.max(...safeRules.map(getRuleCount), 1);
  const chartData = safeRules.slice(0, 6).map((rule, index) => ({
    key: getRuleName(rule),
    label: getRuleName(rule),
    shortLabel: getRuleName(rule).length > 16
      ? `${getRuleName(rule).slice(0, 15)}...`
      : getRuleName(rule),
    count: getRuleCount(rule),
    totalPoints: getRulePoints(rule),
    color: chartColors[index % chartColors.length],
  }));

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 2,
        p: 2.5,
        background: 'rgba(15, 23, 42, 0.88)',
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h2" variant="h6" fontWeight={800}>
            Reguli declansate frecvent
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Semnalele care au contribuit cel mai des la scorul de risc in luna selectata.
          </Typography>
        </Box>

        {isLoading ? (
          <TopRulesSkeleton />
        ) : safeRules.length === 0 ? (
          <EmptyState
            title="Nu exista reguli declansate"
            description="Pentru luna selectata nu exista scanari cu reguli declansate."
            icon={<RuleRoundedIcon fontSize="large" />}
            sx={{ py: 3 }}
          />
        ) : (
          <Stack spacing={2.5}>
            <Box
              sx={{
                height: 220,
                border: '1px solid rgba(148, 163, 184, 0.12)',
                borderRadius: 2,
                p: 1.5,
                bgcolor: 'rgba(2, 6, 23, 0.22)',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    formatter={(value, name, item) => {
                      if (name === 'count') {
                        return [
                          `${formatNumber(value)} declansari`,
                          item?.payload?.label || 'Regula',
                        ];
                      }

                      return [formatNumber(value), name];
                    }}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Bar dataKey="count" radius={[8, 8, 2, 2]} barSize={30}>
                    {chartData.map((item) => (
                      <Cell key={item.key} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {safeRules.map((rule) => {
              const count = getRuleCount(rule);
              const progress = Math.max(4, Math.round((count / maxCount) * 100));

              return (
                <Box key={getRuleName(rule)}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={800} noWrap>
                        {getRuleName(rule)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total puncte: {formatNumber(rule?.totalPoints)}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={`${formatNumber(count)} declansari`}
                      sx={{
                        borderRadius: 1,
                        bgcolor: 'rgba(56, 189, 248, 0.1)',
                        color: 'primary.main',
                        fontWeight: 700,
                      }}
                    />
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      mt: 1.25,
                      height: 6,
                      borderRadius: 999,
                      bgcolor: 'rgba(148, 163, 184, 0.12)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                      },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default TopRulesList;
