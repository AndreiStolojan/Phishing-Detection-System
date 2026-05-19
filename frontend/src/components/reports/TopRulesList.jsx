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

const ruleLabelMap = {
  reply_to_mismatch: 'Reply-To diferit de expeditor',
  shortened_url_detected: 'Link scurtat detectat',
  'suspicious_link_pattern:ip_address_link': 'Link către adresă IP',
  'suspicious_link_pattern:embedded_credentials': 'Date de autentificare în link',
  'suspicious_link_pattern:punycode_domain': 'Domeniu punycode',
  'suspicious_link_pattern:very_long_url': 'URL neobișnuit de lung',
  high_risk_attachment_extension: 'Atașament cu extensie riscantă',
  archive_attachment_extension: 'Atașament arhivă',
  too_many_links_high: 'Număr foarte mare de linkuri',
  too_many_links_medium: 'Număr mare de linkuri',
  'ai_semantic:urgency_high': 'Limbaj urgent puternic',
  'ai_semantic:urgency_medium': 'Limbaj urgent moderat',
  'ai_semantic:sensitive_data_request': 'Cerere de date sensibile',
  'ai_semantic:login_or_action_request': 'Cerere de login sau acțiune',
  'ai_semantic:social_engineering_high': 'Presiune socială puternică',
  'ai_semantic:social_engineering_medium': 'Presiune socială moderată',
  'ai_semantic:brand_impersonation_suspected': 'Posibilă impersonare de brand',
};

const normalizeRuleKey = (value) => String(value ?? '')
  .trim()
  .replaceAll('-', '_')
  .replace(/([a-z])([A-Z])/g, '$1_$2')
  .toLowerCase();

const isAiRuleName = (value) => {
  const normalizedKey = normalizeRuleKey(value);

  return normalizedKey.startsWith('ai_semantic:') || normalizedKey.startsWith('ai_');
};

const prettifyRuleName = (value) => {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return 'Regula necunoscuta';
  }

  const normalizedKey = normalizeRuleKey(rawValue);

  if (ruleLabelMap[normalizedKey]) {
    return ruleLabelMap[normalizedKey];
  }

  return normalizedKey
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getRuleTypeMeta = (rule) => {
  if (isAiRuleName(getRuleName(rule))) {
    return {
      type: 'ai',
      label: 'Semnal AI',
      title: 'Semnale AI',
      description: 'Semnale semantice detectate de Ollama. Ele sunt auxiliare, iar verdictul rămâne calculat de backend.',
      color: '#38bdf8',
      chipSx: {
        bgcolor: 'rgba(56, 189, 248, 0.12)',
        color: 'primary.light',
      },
    };
  }

  return {
    type: 'heuristic',
    label: 'Regulă euristică',
    title: 'Reguli euristice',
    description: 'Reguli clare scrise în backend: linkuri, atașamente, domenii și structură email.',
    color: '#34d399',
    chipSx: {
      bgcolor: 'rgba(52, 211, 153, 0.12)',
      color: 'secondary.light',
    },
  };
};

const getRuleName = (rule) => (
  rule?.rule || rule?.name || rule?.id || 'Regula necunoscuta'
);

const getRuleLabel = (rule) => prettifyRuleName(getRuleName(rule));

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

const RuleGroup = ({ title, description, rules }) => (
  <Box
    sx={{
      border: '1px solid rgba(148, 163, 184, 0.12)',
      borderRadius: 2,
      p: 2,
      bgcolor: 'rgba(2, 6, 23, 0.22)',
      minWidth: 0,
    }}
  >
    <Stack spacing={1.75}>
      <Box>
        <Typography variant="subtitle1" fontWeight={900}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
          {description}
        </Typography>
      </Box>

      {rules.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nu există semnale de acest tip în luna selectată.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rules.map((rule) => {
            const count = getRuleCount(rule);
            const points = getRulePoints(rule);
            const progress = Math.max(4, Math.min(100, Math.round(points)));
            const meta = getRuleTypeMeta(rule);

            return (
              <Box key={getRuleName(rule)}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={850}
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {getRuleLabel(rule)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      A apărut în {formatNumber(count)} emailuri. Impact în scor: {formatNumber(points)} puncte.
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={meta.label}
                    sx={{
                      borderRadius: 1,
                      fontWeight: 800,
                      ...meta.chipSx,
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
                      bgcolor: meta.color,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  </Box>
);

const TopRulesList = ({ rules = [], isLoading = false }) => {
  const safeRules = Array.isArray(rules) ? rules : [];
  const chartData = safeRules.slice(0, 6).map((rule, index) => ({
    key: getRuleName(rule),
    label: getRuleLabel(rule),
    shortLabel: getRuleLabel(rule).length > 16
      ? `${getRuleLabel(rule).slice(0, 15)}...`
      : getRuleLabel(rule),
    count: getRuleCount(rule),
    totalPoints: getRulePoints(rule),
    color: getRuleTypeMeta(rule).type === 'ai'
      ? '#38bdf8'
      : chartColors[index % chartColors.length],
  }));
  const heuristicRules = safeRules.filter((rule) => getRuleTypeMeta(rule).type === 'heuristic');
  const aiRules = safeRules.filter((rule) => getRuleTypeMeta(rule).type === 'ai');

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
            Reguli și semnale frecvente
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Separă regulile euristice scrise în backend de semnalele AI folosite ca ajutor semantic.
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
                  <Bar
                    dataKey="count"
                    radius={[8, 8, 2, 2]}
                    barSize={30}
                    isAnimationActive
                    animationBegin={120}
                    animationDuration={850}
                    animationEasing="ease-out"
                  >
                    {chartData.map((item) => (
                      <Cell key={item.key} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <RuleGroup
                title="Reguli euristice"
                description="Semnale fixe și explicabile: linkuri scurtate, Reply-To diferit, atașamente sau prea multe linkuri."
                rules={heuristicRules}
              />
              <RuleGroup
                title="Semnale AI"
                description="Semnale de limbaj detectate de Ollama: urgență, cereri sensibile, social engineering sau impersonare."
                rules={aiRules}
              />
            </Box>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default TopRulesList;
