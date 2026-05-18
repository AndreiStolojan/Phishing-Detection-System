import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import AttachmentRoundedIcon from '@mui/icons-material/AttachmentRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

const verdictLabels = {
  safe: 'Sigur',
  suspicious: 'Suspect',
  likely_phishing: 'Probabil phishing',
  phishing: 'Phishing confirmat',
};

const verdictColors = {
  safe: 'success',
  suspicious: 'warning',
  likely_phishing: 'error',
  phishing: 'error',
};

const riskBucketLabels = {
  safe: 'Risc redus',
  needs_review: 'Necesita verificare',
  quarantine: 'Carantina locala',
  reviewed_safe: 'Confirmat sigur',
  confirmed_phishing: 'Confirmat phishing',
  unscanned: 'Nescanat',
};

const reviewStatusLabels = {
  reviewed: 'Revizuit manual',
  pending_review: 'Asteapta review',
  no_review_needed: 'Nu necesita review',
  unscanned: 'Nescanat',
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

const formatValue = (value, fallback = 'necompletat') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : fallback;
  }

  return String(value);
};

const renderBoolean = (value) => (value ? 'Da' : 'Nu');

const DetailRow = ({ label, value, icon }) => (
  <Stack
    direction="row"
    spacing={1.25}
    alignItems="flex-start"
    sx={{ minWidth: 0 }}
  >
    {icon ? (
      <Box
        sx={{
          color: 'text.secondary',
          display: 'inline-flex',
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        {icon}
      </Box>
    ) : null}

    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          overflowWrap: 'anywhere',
          color: value ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatValue(value)}
      </Typography>
    </Box>
  </Stack>
);

const SectionTitle = ({ icon, children }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
      {icon}
    </Box>
    <Typography variant="subtitle2" fontWeight={800}>
      {children}
    </Typography>
  </Stack>
);

const ChipList = ({ values, emptyLabel = 'Nu exista date' }) => {
  const items = asArray(values);

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {items.map((item) => (
        <Chip
          key={String(item)}
          label={String(item)}
          size="small"
          variant="outlined"
          sx={{
            maxWidth: '100%',
            borderColor: 'rgba(148, 163, 184, 0.28)',
            '& .MuiChip-label': {
              overflowWrap: 'anywhere',
              whiteSpace: 'normal',
            },
          }}
        />
      ))}
    </Stack>
  );
};

const EmailDetailPanel = ({ email }) => {
  if (!email) {
    return null;
  }

  const effectiveVerdict = email.effectiveVerdict || null;
  const riskBucket = email.riskBucket || 'unscanned';
  const reviewStatus = email.reviewStatus || 'unscanned';
  const suspiciousPatterns = asArray(email.suspiciousLinkPatterns);
  const attachmentExtensions = asArray(email.attachmentExtensions);
  const linkDomains = asArray(email.linkDomains);
  const hasReplyToMismatch =
    email.senderDomain &&
    email.replyToDomain &&
    email.senderDomain !== email.replyToDomain;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid rgba(148, 163, 184, 0.18)',
        bgcolor: 'rgba(15, 23, 42, 0.86)',
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={2.5}>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              label={effectiveVerdict ? verdictLabels[effectiveVerdict] || effectiveVerdict : 'Fara verdict'}
              color={verdictColors[effectiveVerdict] || 'default'}
              size="small"
              variant={effectiveVerdict ? 'filled' : 'outlined'}
            />
            <Chip
              label={riskBucketLabels[riskBucket] || riskBucket}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'rgba(148, 163, 184, 0.28)' }}
            />
            <Chip
              label={reviewStatusLabels[reviewStatus] || reviewStatus}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'rgba(148, 163, 184, 0.28)' }}
            />
            {email.isQuarantined ? (
              <Chip
                label="Carantina locala"
                color="error"
                size="small"
                icon={<WarningAmberRoundedIcon />}
              />
            ) : null}
          </Stack>

          <Typography component="h1" variant="h5" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>
            {email.subject || 'Fara subiect'}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Primit la {formatDateTime(email.receivedAt)}
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <Stack spacing={1.5}>
            <SectionTitle icon={<PersonRoundedIcon fontSize="small" />}>
              Expeditor si destinatari
            </SectionTitle>
            <DetailRow label="Nume afisat" value={email.displayName} />
            <DetailRow label="From" value={email.from} icon={<AlternateEmailRoundedIcon fontSize="small" />} />
            <DetailRow label="To" value={email.to} />
            <DetailRow label="Reply-To" value={email.replyTo} />
          </Stack>

          <Stack spacing={1.5}>
            <SectionTitle icon={<SecurityRoundedIcon fontSize="small" />}>
              Metadate utile
            </SectionTitle>
            <DetailRow label="Provider" value={email.provider} />
            <DetailRow label="Domeniu expeditor" value={email.senderDomain} />
            <DetailRow label="Domeniu Reply-To" value={email.replyToDomain} />
            <DetailRow label="Sursa verdictului" value={email.verdictSource || 'fara verdict'} />
          </Stack>
        </Box>

        {email.snippet ? (
          <>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={800}>
                Fragment email
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  lineHeight: 1.7,
                  overflowWrap: 'anywhere',
                }}
              >
                {email.snippet}
              </Typography>
            </Stack>
          </>
        ) : null}

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

        <Stack spacing={1.75}>
          <SectionTitle icon={<WarningAmberRoundedIcon fontSize="small" />}>
            Semnale de securitate extrase
          </SectionTitle>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <DetailRow
              label="Numar linkuri"
              value={Number.isFinite(email.linkCount) ? email.linkCount : 0}
              icon={<LinkRoundedIcon fontSize="small" />}
            />
            <DetailRow
              label="Link scurtat"
              value={renderBoolean(Boolean(email.hasShortenedUrl))}
              icon={<LinkRoundedIcon fontSize="small" />}
            />
            <DetailRow
              label="Atasamente"
              value={attachmentExtensions.length > 0 ? attachmentExtensions.join(', ') : 'nu apar extensii'}
              icon={<AttachmentRoundedIcon fontSize="small" />}
            />
            <DetailRow
              label="Reply-To diferit de expeditor"
              value={renderBoolean(Boolean(hasReplyToMismatch))}
              icon={<AlternateEmailRoundedIcon fontSize="small" />}
            />
          </Box>

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Domenii din linkuri
            </Typography>
            <ChipList values={linkDomains} emptyLabel="Nu exista domenii de link extrase." />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Pattern-uri suspecte in linkuri
            </Typography>
            <ChipList values={suspiciousPatterns} emptyLabel="Nu au fost raportate pattern-uri suspecte." />
          </Stack>

          {email.lastProviderAction ? (
            <Tooltip title="Aceasta este ultima actiune raportata de provider, separata de review-ul local.">
              <Chip
                label={`Ultima actiune provider: ${email.lastProviderActionStatus || 'necunoscut'}`}
                color={email.lastProviderActionStatus === 'success' ? 'success' : 'warning'}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            </Tooltip>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default EmailDetailPanel;
