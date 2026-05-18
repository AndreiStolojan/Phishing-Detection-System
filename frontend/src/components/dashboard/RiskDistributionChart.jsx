import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

const normalizeData = (data) => (
  Array.isArray(data)
    ? data
      .map((item) => ({
        ...item,
        value: Number(item?.value ?? 0),
      }))
      .filter((item) => Number.isFinite(item.value) && item.value >= 0)
    : []
);

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

const ChartSkeleton = ({ height }) => (
  <Stack spacing={1.5}>
    <Skeleton variant="rounded" height={height} sx={{ borderRadius: 2 }} />
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} variant="rounded" width={96} height={28} />
      ))}
    </Stack>
  </Stack>
);

const CenterLabel = ({ total, label }) => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'none',
    }}
  >
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={900} lineHeight={1}>
        {formatNumber(total)}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={800}>
        {label}
      </Typography>
    </Box>
  </Box>
);

const Legend = ({ data, total }) => (
  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
    {data.map((item) => {
      const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

      return (
        <Chip
          key={item.key || item.label}
          size="small"
          label={`${item.label}: ${formatNumber(item.value)} (${percent}%)`}
          sx={{
            maxWidth: '100%',
            borderRadius: 1,
            color: item.color,
            bgcolor: 'rgba(148, 163, 184, 0.08)',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            fontWeight: 800,
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      );
    })}
  </Stack>
);

const InsightRow = ({ label, value, color = '#94a3b8' }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    spacing={2}
    sx={{
      border: '1px solid rgba(148, 163, 184, 0.12)',
      borderRadius: 1.5,
      px: 1.5,
      py: 1,
      bgcolor: 'rgba(2, 6, 23, 0.24)',
    }}
  >
    <Typography variant="caption" color="text.secondary" fontWeight={800}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={900} sx={{ color }}>
      {typeof value === 'number' ? formatNumber(value) : value}
    </Typography>
  </Stack>
);

const RiskDistributionChart = ({
  title = 'Distributie risc',
  subtitle,
  data = [],
  chartType = 'donut',
  centerLabel = 'total',
  footerLabel,
  footerValue,
  insights = [],
  isLoading = false,
  height = 238,
  emptyTitle = 'Nu exista date pentru chart',
  emptyDescription = 'Chart-ul va aparea dupa ce exista date sincronizate si scanate.',
}) => {
  const chartData = normalizeData(data);
  const positiveData = chartData.filter((item) => item.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const renderData = positiveData.length > 0 ? positiveData : chartData;

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 2,
        p: { xs: 2, sm: 2.5 },
        background:
          'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.84) 100%)',
        boxShadow: '0 22px 70px rgba(2, 6, 23, 0.22)',
      }}
    >
      <Stack spacing={2.25} sx={{ height: '100%' }}>
        <Box>
          <Typography component="h2" variant="h6" fontWeight={900}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : !hasData ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<BarChartRoundedIcon fontSize="large" />}
            sx={{ py: 3, flexGrow: 1 }}
          />
        ) : (
          <>
            <Box sx={{ position: 'relative', height }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(148, 163, 184, 0.12)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
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
                      formatter={(value) => [formatNumber(value), 'Total']}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Bar dataKey="value" radius={[8, 8, 2, 2]} barSize={34}>
                      {chartData.map((item) => (
                        <Cell key={item.key || item.label} fill={item.color || '#38bdf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Tooltip
                      formatter={(value, name) => [formatNumber(value), name]}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Pie
                      data={renderData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="66%"
                      outerRadius="88%"
                      paddingAngle={3}
                      stroke="rgba(15, 23, 42, 0.92)"
                      strokeWidth={3}
                    >
                      {renderData.map((item) => (
                        <Cell key={item.key || item.label} fill={item.color || '#38bdf8'} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>

              {chartType !== 'bar' ? (
                <CenterLabel total={total} label={centerLabel} />
              ) : null}
            </Box>

            <Legend data={chartData} total={total} />
          </>
        )}

        {(footerLabel || footerValue !== undefined || insights.length > 0) ? (
          <Stack spacing={1}>
            {(footerLabel || footerValue !== undefined) ? (
              <InsightRow
                label={footerLabel || 'Indicator'}
                value={footerValue ?? '-'}
                color="#38bdf8"
              />
            ) : null}
            {insights.map((item) => (
              <InsightRow
                key={item.label}
                label={item.label}
                value={item.value}
                color={item.color}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default RiskDistributionChart;
