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

import { getMailAccounts, startGoogleMailAccountConnection, syncMailAccount } from '../api/mailAccountsApi.js';
import { getMetaStatus } from '../api/metaApi.js';
import GmailStatusPanel from '../components/dashboard/GmailStatusPanel.jsx';
import RiskDistributionChart from '../components/dashboard/RiskDistributionChart.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import { useAuth } from '../hooks/useAuth.js';

const emptyCounts = {
  mailAccountsCount: 0,
  emailsCount: 0,
  scansCount: 0,
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
      label: 'Scanari in urma',
      helper: 'Exista emailuri salvate care nu au inca scanare persistata.',
      chip: 'Atentie',
      chipColor: 'warning',
      accentColor: '#f59e0b',
    };
  }

  if (unscannedCount > 0) {
    return {
      label: 'Aproape complet',
      helper: 'Majoritatea emailurilor au scanare, dar mai exista cateva intrari restante.',
      chip: 'Monitorizare',
      chipColor: 'info',
      accentColor: '#38bdf8',
    };
  }

  return {
    label: 'Flux stabil',
    helper: 'Emailurile salvate au scanari persistate si pot fi inspectate in lista de emailuri.',
    chip: 'Operational',
    chipColor: 'success',
    accentColor: '#4ade80',
  };
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [metaStatus, setMetaStatus] = useState(null);
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
      const [nextMetaStatus, nextMailAccounts] = await Promise.all([
        getMetaStatus(),
        getMailAccounts(),
      ]);

      setMetaStatus(nextMetaStatus);
      setMailAccounts(Array.isArray(nextMailAccounts) ? nextMailAccounts : []);
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
  const mailAccountsCount = toSafeNumber(counts.mailAccountsCount);
  const emailsCount = toSafeNumber(counts.emailsCount);
  const scansCount = toSafeNumber(counts.scansCount);
  const scanCoverage = getScanCoverage({ emailsCount, scansCount });
  const unscannedCount = Math.max(emailsCount - scansCount, 0);
  const posture = getRiskPosture({
    hasGmailConnected,
    emailsCount,
    unscannedCount,
    scanCoverage,
  });

  const pipelineChartData = useMemo(() => ([
    {
      key: 'accounts',
      label: 'Conturi',
      value: mailAccountsCount,
      color: '#38bdf8',
    },
    {
      key: 'emails',
      label: 'Emailuri',
      value: emailsCount,
      color: '#22c55e',
    },
    {
      key: 'scans',
      label: 'Scanari',
      value: scansCount,
      color: '#f59e0b',
    },
  ]), [emailsCount, mailAccountsCount, scansCount]);

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
    <Container maxWidth="xl" disableGutters>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography component="h1" variant="h4" fontWeight={900}>
              Panou securitate email
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              Monitorizeaza conexiunea Gmail, acoperirea scanarii si starea fluxului de
              detectie phishing pentru contul curent.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Utilizator: {user?.name || user?.email || 'Utilizator'}
              {user?.email ? ` (${user.email})` : ''}
            </Typography>
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
            }}
          >
            Actualizeaza status
          </Button>
        </Stack>

        {loadError && (
          <Alert severity="error">
            {loadError}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <StatCard
            eyebrow="Conectivitate"
            title="Conturi email"
            value={formatNumber(mailAccountsCount)}
            helper={hasGmailConnected ? 'Gmail activ pentru sync' : 'Gmail nu este conectat'}
            icon={<EmailRounded fontSize="small" />}
            accentColor={hasGmailConnected ? 'success.main' : 'warning.main'}
            progress={hasGmailConnected ? 100 : 0}
            isLoading={isLoading && !metaStatus}
          />
          <StatCard
            eyebrow="Ingestie"
            title="Emailuri salvate"
            value={formatNumber(emailsCount)}
            helper="Total emailuri sincronizate in baza de date"
            icon={<StorageRounded fontSize="small" />}
            accentColor="primary.main"
            isLoading={isLoading && !metaStatus}
          />
          <StatCard
            eyebrow="Detectie"
            title="Scanari persistate"
            value={formatNumber(scansCount)}
            helper={
              hasAiEnabled || hasSemanticAi
                ? `Acoperire ${scanCoverage}% cu reguli + AI optional`
                : `Acoperire ${scanCoverage}% prin reguli`
            }
            icon={<SecurityRounded fontSize="small" />}
            accentColor="secondary.main"
            progress={scanCoverage}
            isLoading={isLoading && !metaStatus}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(320px, 0.8fr) minmax(0, 1.2fr)',
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
            }}
          >
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
                      Risk posture
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Calculat doar din starea Gmail si acoperirea scanarii.
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
                    Coada scanare
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
                    AI semantic
                  </Typography>
                  <Typography variant="h6" fontWeight={900}>
                    {hasAiEnabled || hasSemanticAi ? 'activ' : 'oprit'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>

          <RiskDistributionChart
            title="Pipeline date"
            subtitle="Volumul disponibil in dashboard: conturi, emailuri salvate si scanari persistate."
            chartType="bar"
            data={pipelineChartData}
            footerLabel="Acoperire scanare"
            footerValue={`${scanCoverage}%`}
            insights={[
              {
                label: 'Emailuri fara scanare',
                value: unscannedCount,
                color: unscannedCount > 0 ? '#f59e0b' : '#4ade80',
              },
              {
                label: 'Gmail',
                value: hasGmailConnected ? 'conectat' : 'neconectat',
                color: hasGmailConnected ? '#4ade80' : '#f59e0b',
              },
            ]}
            isLoading={isLoading && !metaStatus}
            emptyTitle="Nu exista date sincronizate"
            emptyDescription="Conecteaza Gmail si ruleaza sync pentru a popula pipeline-ul."
          />
        </Box>

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
        />

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
