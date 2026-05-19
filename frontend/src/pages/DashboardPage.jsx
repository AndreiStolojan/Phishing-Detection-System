import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import EmailRounded from '@mui/icons-material/EmailRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';

import { getEmails } from '../api/emailsApi.js';
import { getMailAccounts, startGoogleMailAccountConnection, syncMailAccount } from '../api/mailAccountsApi.js';
import { getMetaStatus } from '../api/metaApi.js';
import { getMonthlySummary } from '../api/reportsApi.js';
import GmailStatusPanel from '../components/dashboard/GmailStatusPanel.jsx';
import RiskDistributionChart from '../components/dashboard/RiskDistributionChart.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import { useAuth } from '../hooks/useAuth.js';

const emptyCounts = {
  mailAccountsCount: 0,
  emailsCount: 0,
  scansCount: 0,
};

const emptyRiskBucketCounts = {
  safe: 0,
  needs_review: 0,
  quarantine: 0,
  reviewed_safe: 0,
  confirmed_phishing: 0,
  unscanned: 0,
};

const getErrorMessage = (error) => (
  error?.message || 'A aparut o eroare. Verifica daca backend-ul ruleaza.'
);

const isGmailProvider = (account) => {
  const provider = account?.provider?.toLowerCase();

  return provider === 'google' || provider === 'gmail';
};

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const numberFormatter = new Intl.NumberFormat('ro-RO');

const formatDateTime = (value) => {
  if (!value) {
    return 'inca neactualizat';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'data necunoscuta' : dateFormatter.format(date);
};

const toSafeNumber = (value) => {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatNumber = (value) => numberFormatter.format(toSafeNumber(value));

const getCurrentMonthValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${now.getFullYear()}-${month}`;
};

const getEmailBucketTotal = async (riskBucket) => {
  const result = await getEmails({
    riskBucket,
    page: 1,
    limit: 1,
  });

  return toSafeNumber(result?.pagination?.total);
};

const getRiskBucketCounts = async () => {
  const entries = await Promise.all(
    Object.keys(emptyRiskBucketCounts).map(async (riskBucket) => [
      riskBucket,
      await getEmailBucketTotal(riskBucket),
    ])
  );

  return Object.fromEntries(entries);
};

const getScanCoverage = ({ emailsCount, scansCount }) => {
  if (emailsCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((scansCount / emailsCount) * 100));
};

const getRiskPosture = ({
  hasGmailConnected,
  emailsCount,
  unscannedCount,
  reviewQueueCount,
  confirmedPhishingCount,
  scanCoverage,
}) => {
  if (!hasGmailConnected) {
    return {
      label: 'Setup incomplet',
      helper: 'Conecteaza Gmail ca sa poti sincroniza si scana emailuri reale.',
      chip: 'Necesita conectare',
      chipColor: 'warning',
      accentColor: '#f59e0b',
    };
  }

  if (reviewQueueCount > 0) {
    return {
      label: 'Necesită verificare',
      helper: 'Există emailuri suspecte sau cu risc ridicat care merită inspectate manual.',
      chip: 'Verifică emailurile',
      chipColor: 'warning',
      accentColor: '#f59e0b',
    };
  }

  if (confirmedPhishingCount > 0) {
    return {
      label: 'Phishing confirmat',
      helper: 'Ai emailuri confirmate manual ca phishing. Raportul lunar le păstrează separat.',
      chip: 'Confirmări active',
      chipColor: 'error',
      accentColor: '#f87171',
    };
  }

  if (emailsCount === 0) {
    return {
      label: 'Asteapta primul sync',
      helper: 'Contul este conectat, dar inca nu exista emailuri salvate pentru analiza.',
      chip: 'Fara date',
      chipColor: 'info',
      accentColor: '#38bdf8',
    };
  }

  if (scanCoverage < 80) {
    return {
      label: 'Acoperire incompletă',
      helper: 'Există emailuri salvate care nu au încă rezultat de scanare persistat.',
      chip: 'Atentie',
      chipColor: 'warning',
      accentColor: '#f59e0b',
    };
  }

  if (unscannedCount > 0) {
    return {
      label: 'Aproape complet',
      helper: 'Majoritatea emailurilor au scanare, dar mai există câteva intrări nescanate.',
      chip: 'Monitorizare',
      chipColor: 'info',
      accentColor: '#38bdf8',
    };
  }

  return {
    label: 'Flux stabil',
    helper: 'Emailurile salvate au scanări persistate, iar lista de verificare este goală.',
    chip: 'Operational',
    chipColor: 'success',
    accentColor: '#4ade80',
  };
};

const getNextStepCopy = ({
  hasGmailConnected,
  emailsCount,
  unscannedCount,
  scanCoverage,
  reviewQueueCount,
}) => {
  if (!hasGmailConnected) {
    return {
      title: 'Conecteaza Gmail',
      description: 'Primul pas este conectarea contului Gmail. Dupa OAuth, dashboardul poate sincroniza emailuri reale.',
    };
  }

  if (emailsCount === 0) {
    return {
      title: 'Ruleaza primul sync',
      description: 'Gmail este conectat. Urmatorul pas este sincronizarea, care salveaza emailurile si porneste scanarea automata.',
    };
  }

  if (unscannedCount > 0 || scanCoverage < 100) {
    return {
      title: 'Sincronizeaza si scaneaza',
      description: 'Exista emailuri fara scanare persistata. Ruleaza sync pentru a completa analiza unde este nevoie.',
    };
  }

  if (reviewQueueCount > 0) {
    return {
      title: 'Verifică emailurile suspecte',
      description: 'Scanarea este la zi. Următorul pas este review-ul manual pentru emailurile suspecte.',
    };
  }

  return {
    title: 'Verifica emailurile cu risc',
    description: 'Fluxul este la zi. Urmatorul pas practic este inspectarea emailurilor suspecte in lista de emailuri.',
  };
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [metaStatus, setMetaStatus] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [riskBucketCounts, setRiskBucketCounts] = useState(emptyRiskBucketCounts);
  const [mailAccounts, setMailAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [nextMetaStatus, nextMailAccounts, nextMonthlySummary, nextRiskBucketCounts] = await Promise.all([
        getMetaStatus(),
        getMailAccounts(),
        getMonthlySummary({ month: getCurrentMonthValue() }),
        getRiskBucketCounts(),
      ]);

      setMetaStatus(nextMetaStatus);
      setMailAccounts(Array.isArray(nextMailAccounts) ? nextMailAccounts : []);
      setMonthlySummary(nextMonthlySummary);
      setRiskBucketCounts({
        ...emptyRiskBucketCounts,
        ...(nextRiskBucketCounts ?? {}),
      });
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const gmailAccounts = useMemo(
    () => mailAccounts.filter(isGmailProvider),
    [mailAccounts]
  );

  const activeGmailAccount = useMemo(
    () => gmailAccounts.find((account) => account.status === 'active') ?? null,
    [gmailAccounts]
  );

  const visibleGmailAccount = activeGmailAccount ?? gmailAccounts[0] ?? null;
  const counts = metaStatus?.counts ?? emptyCounts;
  const flags = metaStatus?.flags ?? {};
  const hasGmailConnected = Boolean(flags.hasGmailConnected || activeGmailAccount);
  const hasAiEnabled = Boolean(flags.aiEnabled);
  const hasSemanticAi = Boolean(flags.aiSemanticEnabled);
  const emailsCount = toSafeNumber(counts.emailsCount);
  const scansCount = toSafeNumber(counts.scansCount);
  const scanCoverage = getScanCoverage({ emailsCount, scansCount });
  const unscannedCount = toSafeNumber(riskBucketCounts.unscanned);
  const safeCount = toSafeNumber(riskBucketCounts.safe) + toSafeNumber(riskBucketCounts.reviewed_safe);
  const reviewQueueCount = toSafeNumber(riskBucketCounts.needs_review) + toSafeNumber(riskBucketCounts.quarantine);
  const likelyPhishingQueueCount = toSafeNumber(riskBucketCounts.quarantine);
  const confirmedPhishingCount = toSafeNumber(riskBucketCounts.confirmed_phishing);
  const isRefreshing = isLoading && Boolean(metaStatus);
  const posture = getRiskPosture({
    hasGmailConnected,
    emailsCount,
    unscannedCount,
    reviewQueueCount,
    confirmedPhishingCount,
    scanCoverage,
  });
  const nextStep = getNextStepCopy({
    hasGmailConnected,
    emailsCount,
    unscannedCount,
    scanCoverage,
    reviewQueueCount,
  });

  const monthlyCounts = monthlySummary?.counts ?? {};
  const monthlySafeTotal = toSafeNumber(monthlyCounts.safe);
  const monthlySuspiciousTotal = toSafeNumber(monthlyCounts.suspicious);
  const monthlyLikelyPhishingTotal = toSafeNumber(monthlyCounts.likelyPhishing);
  const monthlyRiskTotal = monthlySuspiciousTotal + monthlyLikelyPhishingTotal;

  const verdictChartData = useMemo(() => ([
    {
      key: 'safe',
      label: 'Sigur',
      value: monthlySafeTotal,
      color: '#4ade80',
    },
    {
      key: 'suspicious',
      label: 'Suspect',
      value: monthlySuspiciousTotal,
      color: '#f59e0b',
    },
    {
      key: 'likely_phishing',
      label: 'Probabil phishing',
      value: monthlyLikelyPhishingTotal,
      color: '#f87171',
    },
  ]), [monthlyLikelyPhishingTotal, monthlySafeTotal, monthlySuspiciousTotal]);

  const handleConnectGmail = useCallback(async () => {
    setActionError(null);

    try {
      setIsConnectLoading(true);
      const result = await startGoogleMailAccountConnection();

      if (!result?.authUrl) {
        throw new Error('Backend-ul nu a trimis URL-ul de conectare Gmail.');
      }

      window.location.assign(result.authUrl);
    } catch (error) {
      setActionError(getErrorMessage(error));
      setIsConnectLoading(false);
    }
  }, []);

  const handleSyncGmail = useCallback(async () => {
    if (!activeGmailAccount?._id) {
      setActionError('Nu exista un cont Gmail activ pentru sincronizare.');
      return;
    }

    setActionError(null);
    setIsSyncLoading(true);

    try {
      const result = await syncMailAccount(activeGmailAccount._id);

      setSyncResult(result);
      await loadDashboardData();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsSyncLoading(false);
    }
  }, [activeGmailAccount, loadDashboardData]);

  return (
    <Container maxWidth={false} disableGutters sx={{ width: '100%' }}>
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography component="h1" variant="h4" fontWeight={900}>
              Dashboard securitate email
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              {nextStep.description}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              <Chip
                size="small"
                color={hasGmailConnected ? 'success' : 'warning'}
                label={hasGmailConnected ? 'Gmail conectat' : 'Gmail lipseste'}
                sx={{ borderRadius: 1, fontWeight: 900 }}
              />
              <Chip
                size="small"
                color={unscannedCount > 0 ? 'warning' : 'success'}
                variant="outlined"
                label={nextStep.title}
                sx={{ borderRadius: 1, fontWeight: 900 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Utilizator: ${user?.name || user?.email || 'Utilizator'}`}
                sx={{ borderRadius: 1, fontWeight: 800 }}
              />
            </Stack>
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={
              isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshRounded />
            }
            onClick={loadDashboardData}
            disabled={isLoading || isSyncLoading || isConnectLoading}
            sx={{
              alignSelf: { xs: 'stretch', md: 'flex-start' },
              minWidth: 188,
              borderColor: 'rgba(148, 163, 184, 0.26)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isRefreshing ? 'Se actualizeaza...' : 'Actualizeaza status'}
          </Button>
        </Stack>

        {loadError && (
          <Alert severity="error">
            {loadError}
          </Alert>
        )}

        <GmailStatusPanel
          gmailAccount={visibleGmailAccount}
          hasGmailConnected={hasGmailConnected}
          isLoading={isLoading}
          isConnectLoading={isConnectLoading}
          isSyncLoading={isSyncLoading}
          syncResult={syncResult}
          error={actionError}
          onConnect={handleConnectGmail}
          onSync={handleSyncGmail}
          reviewQueueCount={reviewQueueCount}
          confirmedPhishingCount={confirmedPhishingCount}
          likelyPhishingQueueCount={likelyPhishingQueueCount}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <StatCard
            eyebrow="Review"
            title="Necesită verificare"
            value={formatNumber(reviewQueueCount)}
            helper="Emailuri suspecte sau cu risc ridicat, încă nerevizuite"
            icon={<WarningAmberRounded fontSize="small" />}
            accentColor={reviewQueueCount > 0 ? 'warning.main' : 'success.main'}
            progress={emailsCount > 0 ? Math.min(100, Math.round((reviewQueueCount / emailsCount) * 100)) : 0}
            isLoading={isLoading && !metaStatus}
            isRefreshing={isRefreshing}
          />
          <StatCard
            eyebrow="Risc ridicat"
            title="Probabil phishing"
            value={formatNumber(likelyPhishingQueueCount)}
            helper="Emailuri încadrate de scanare ca risc ridicat"
            icon={<SecurityRounded fontSize="small" />}
            accentColor={likelyPhishingQueueCount > 0 ? 'error.main' : 'success.main'}
            progress={emailsCount > 0 ? Math.min(100, Math.round((likelyPhishingQueueCount / emailsCount) * 100)) : 0}
            isLoading={isLoading && !metaStatus}
            isRefreshing={isRefreshing}
          />
          <StatCard
            eyebrow="Manual"
            title="Confirmate phishing"
            value={formatNumber(confirmedPhishingCount)}
            helper="Emailuri marcate manual ca phishing"
            icon={<EmailRounded fontSize="small" />}
            accentColor={confirmedPhishingCount > 0 ? 'error.main' : 'primary.main'}
            isLoading={isLoading && !metaStatus}
            isRefreshing={isRefreshing}
          />
          <StatCard
            eyebrow="Acoperire"
            title="Scanare automată"
            value={`${scanCoverage}%`}
            helper={
              hasAiEnabled || hasSemanticAi
                ? `${formatNumber(scansCount)} rezultate cu reguli + AI opțional`
                : `${formatNumber(scansCount)} rezultate prin reguli euristice`
            }
            icon={<StorageRounded fontSize="small" />}
            accentColor="secondary.main"
            progress={scanCoverage}
            isLoading={isLoading && !metaStatus}
            isRefreshing={isRefreshing}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(360px, 0.72fr) minmax(0, 1.28fr)',
            },
            gap: 2,
          }}
        >
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
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isRefreshing ? (
              <LinearProgress
                aria-label="Se actualizeaza postura de risc"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  bgcolor: 'transparent',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: posture.accentColor,
                  },
                }}
              />
            ) : null}
            <Stack spacing={2.25}>
              <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      color: posture.accentColor,
                      bgcolor: 'rgba(148, 163, 184, 0.09)',
                      flexShrink: 0,
                    }}
                  >
                    {unscannedCount > 0 || !hasGmailConnected ? (
                      <WarningAmberRounded fontSize="small" />
                    ) : (
                      <SecurityRounded fontSize="small" />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="h2" variant="h6" fontWeight={900}>
                      Starea protecției
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Calculată din starea Gmail, coada de review și scanările salvate.
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  size="small"
                  color={posture.chipColor}
                  label={posture.chip}
                  sx={{ borderRadius: 1, fontWeight: 900 }}
                />
              </Stack>

              <Box>
                <Typography variant="h5" fontWeight={900}>
                  {posture.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {posture.helper}
                </Typography>
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="body2" color="text.secondary" fontWeight={800}>
                    Acoperire scanare
                  </Typography>
                  <Typography variant="body2" fontWeight={900} sx={{ color: posture.accentColor }}>
                    {scanCoverage}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={scanCoverage}
                  sx={{
                    mt: 1,
                    height: 8,
                    borderRadius: 999,
                    bgcolor: 'rgba(148, 163, 184, 0.12)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      bgcolor: posture.accentColor,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'rgba(2, 6, 23, 0.24)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    Nescanate
                  </Typography>
                  <Typography variant="h6" fontWeight={900}>
                    {formatNumber(unscannedCount)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'rgba(2, 6, 23, 0.24)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    Emailuri sigure
                  </Typography>
                  <Typography variant="h6" fontWeight={900}>
                    {formatNumber(safeCount)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>

          <RiskDistributionChart
            title="Verdicturi luna curentă"
            subtitle="Distribuția scanărilor din raportul lunar curent."
            data={verdictChartData}
            centerLabel="scanări"
            footerLabel="Emailuri cu risc"
            footerValue={formatNumber(monthlyRiskTotal)}
            insights={[
              {
                label: 'Necesită verificare acum',
                value: reviewQueueCount,
                color: reviewQueueCount > 0 ? '#f59e0b' : '#4ade80',
              },
              {
                label: 'Confirmate phishing',
                value: confirmedPhishingCount,
                color: confirmedPhishingCount > 0 ? '#f87171' : '#94a3b8',
              },
            ]}
            isLoading={isLoading && !metaStatus}
            emptyTitle="Nu există verdicturi în luna curentă"
            emptyDescription="Sincronizează Gmail pentru a genera scanări și statistici."
            isRefreshing={isRefreshing}
          />
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
          <SyncRounded fontSize="inherit" />
          <Typography variant="caption">
            Status generat: {formatDateTime(metaStatus?.generatedAt)}
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
};

export default DashboardPage;
