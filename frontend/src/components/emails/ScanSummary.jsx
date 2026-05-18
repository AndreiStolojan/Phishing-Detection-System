import {
  Alert,
  Box,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';

const verdictLabels = {
  safe: 'Sigur',
  suspicious: 'Suspect',
  likely_phishing: 'Probabil phishing',
};

const verdictColors = {
  safe: 'success',
  suspicious: 'warning',
  likely_phishing: 'error',
};

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const formatDateTime = (value) => {
  if (!value) {
    return 'necunoscut';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'necunoscut' : dateFormatter.format(date);
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
};

const formatMetricValue = (value) => {
  if (Number.isFinite(value)) {
    return value;
  }

  return value || 'n/a';
};

const getRuleLabel = (rule) => {
  if (!rule) {
    return 'regula necunoscuta';
  }

  if (typeof rule === 'string') {
    return rule;
  }

  return rule.rule || 'regula necunoscuta';
};

const getRulePoints = (rule) => {
  if (!rule || typeof rule === 'string') {
    return null;
  }

  if (Number.isFinite(rule.points)) {
    return rule.points;
  }

  if (Number.isFinite(rule.score)) {
    return rule.score;
  }

  return null;
};

const getRuleDetails = (rule) => {
  if (!rule || typeof rule === 'string') {
    return '';
  }

  return rule.details || rule.message || '';
};

const ScoreItem = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={800}>
      {formatMetricValue(value)}
    </Typography>
  </Box>
);

const ScanSummary = ({ scan }) => {
  if (!scan) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid rgba(148, 163, 184, 0.18)',
          bgcolor: 'rgba(15, 23, 42, 0.86)',
          p: { xs: 2, md: 2.5 },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ShieldRoundedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={800}>
              Scanare curenta
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Nu exista inca o scanare curenta pentru acest email. Foloseste butonul Rescan pentru
            a cere backend-ului o scanare manuala.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const reasons = asArray(scan.reasons);
  const triggeredRules = asArray(scan.triggeredRules);
  const explanationSummary = scan.aiExplanation?.summary || '';
  const score = formatNumber(scan.score);
  const normalizedScore = Math.max(0, Math.min(score, 100));

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid rgba(148, 163, 184, 0.18)',
        bgcolor: 'rgba(15, 23, 42, 0.86)',
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <ShieldRoundedIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                Scanare curenta
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scanat la {formatDateTime(scan.scannedAt)}
              </Typography>
            </Box>
          </Stack>

          <Chip
            label={verdictLabels[scan.verdict] || scan.verdict || 'Fara verdict'}
            color={verdictColors[scan.verdict] || 'default'}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          />
        </Stack>

        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            spacing={2}
          >
            <Typography variant="body2" color="text.secondary">
              Scor total de risc
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              {score}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={normalizedScore}
            color={score >= 60 ? 'error' : score >= 30 ? 'warning' : 'success'}
            sx={{
              mt: 1,
              height: 8,
              borderRadius: 999,
              bgcolor: 'rgba(148, 163, 184, 0.16)',
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ScoreItem label="Scor reguli" value={scan.ruleScore} />
          <ScoreItem label="Scor AI semantic" value={scan.aiScore} />
          <ScoreItem label="Versiune motor" value={scan.engineVersion || 'n/a'} />
        </Box>

        {reasons.length > 0 ? (
          <>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FactCheckRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={800}>
                  Motive
                </Typography>
              </Stack>
              <List dense disablePadding>
                {reasons.map((reason, index) => (
                  <ListItem key={`${reason}-${index}`} disableGutters sx={{ py: 0.35 }}>
                    <ListItemText
                      primary={reason}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: 'text.secondary',
                        sx: { overflowWrap: 'anywhere' },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </>
        ) : null}

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <RuleRoundedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800}>
              Reguli declansate
            </Typography>
          </Stack>

          {triggeredRules.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {triggeredRules.map((rule, index) => {
                const points = getRulePoints(rule);
                const details = getRuleDetails(rule);
                const label = points === null
                  ? getRuleLabel(rule)
                  : `${getRuleLabel(rule)} (+${points})`;

                return (
                  <Chip
                    key={`${getRuleLabel(rule)}-${index}`}
                    label={label}
                    title={details}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(148, 163, 184, 0.28)',
                      maxWidth: '100%',
                      '& .MuiChip-label': {
                        overflowWrap: 'anywhere',
                        whiteSpace: 'normal',
                      },
                    }}
                  />
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nu exista reguli declansate pentru scanarea curenta.
            </Typography>
          )}
        </Stack>

        {explanationSummary ? (
          <Alert
            icon={<AutoAwesomeRoundedIcon fontSize="inherit" />}
            severity="info"
            variant="outlined"
            sx={{
              borderColor: 'rgba(56, 189, 248, 0.32)',
              bgcolor: 'rgba(14, 165, 233, 0.08)',
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Explicatie AI
            </Typography>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {explanationSummary}
            </Typography>
            {scan.aiExplanationMeta?.status ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Status: {scan.aiExplanationMeta.status}
                {scan.aiExplanationMeta.source ? `, sursa: ${scan.aiExplanationMeta.source}` : ''}
                {scan.aiExplanationMeta.fallbackReason
                  ? `, fallback: ${scan.aiExplanationMeta.fallbackReason}`
                  : ''}
              </Typography>
            ) : null}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default ScanSummary;
