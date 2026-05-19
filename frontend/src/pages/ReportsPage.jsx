import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DangerousRoundedIcon from '@mui/icons-material/DangerousRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ReviewsRoundedIcon from '@mui/icons-material/ReviewsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import { getMonthlySummary, sendMonthlySummaryDigest } from '../api/reportsApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorMessage, { getErrorMessage } from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import RiskDistributionChart from '../components/dashboard/RiskDistributionChart.jsx';
import MonthlySummaryCard from '../components/reports/MonthlySummaryCard.jsx';
import ReportDeliveryStatus from '../components/reports/ReportDeliveryStatus.jsx';
import TopRulesList from '../components/reports/TopRulesList.jsx';

const dateTimeFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
});

const monthFormatter = new Intl.DateTimeFormat('ro-RO', {
  month: 'long',
  year: 'numeric',
});

const numberFormatter = new Intl.NumberFormat('ro-RO');

const getCurrentMonthValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${now.getFullYear()}-${month}`;
};

const toSafeNumber = (value) => {
  const numericValue = Number(value ?? 0);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatDateTime = (value) => {
  if (!value) {
    return 'inca negenerat';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'data necunoscuta' : dateTimeFormatter.format(date);
};

const formatDate = (value) => {
  if (!value) {
    return 'data necunoscuta';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'data necunoscuta' : dateFormatter.format(date);
};

const formatMonthLabel = (value) => {
  if (!value) {
    return 'luna curenta';
  }

  const date = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return monthFormatter.format(date);
};

const formatNumber = (value) => numberFormatter.format(toSafeNumber(value));

const getPercentage = (part, total) => {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((part / total) * 100));
};

const getDigestResultFromError = (error) => (
  error?.payload?.data
  || error?.data?.data
  || error?.response?.data?.data
  || null
);

const buildDigestFailureResult = (error) => {
  const result = getDigestResultFromError(error);

  if (result) {
    return result;
  }

  return {
    sent: false,
    generatedAt: null,
    error: {
      code: error?.code || 'DIGEST_SEND_FAILED',
      message: getErrorMessage(error),
    },
  };
};

const ReportsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [deliveryState, setDeliveryState] = useState({
    status: 'idle',
    result: null,
    error: null,
  });

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setDeliveryState({
      status: 'idle',
      result: null,
      error: null,
    });

    try {
      const result = await getMonthlySummary({ month: selectedMonth });

      setSummary(result);
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const counts = summary?.counts ?? {};
  const ai = summary?.ai ?? {};
  const period = summary?.period ?? {};
  const syncedTotal = toSafeNumber(counts.syncedEmails);
  const scannedTotal = toSafeNumber(counts.scannedEmails);
  const safeTotal = toSafeNumber(counts.safe);
  const suspiciousTotal = toSafeNumber(counts.suspicious);
  const likelyPhishingTotal = toSafeNumber(counts.likelyPhishing);
  const reviewedTotal = toSafeNumber(counts.reviewed);
  const markedPhishingTotal = toSafeNumber(counts.markedPhishing);
  const quarantinedTotal = toSafeNumber(counts.quarantined);
  const aiEvaluatedTotal = toSafeNumber(ai.evaluated);
  const aiFailedTotal = toSafeNumber(ai.failed);
  const aiDisabledTotal = toSafeNumber(ai.disabled);
  const riskTotal = suspiciousTotal + likelyPhishingTotal;
  const scanCoverage = getPercentage(scannedTotal, syncedTotal);
  const manualReviewRate = getPercentage(reviewedTotal, scannedTotal);
  const riskShare = getPercentage(riskTotal, scannedTotal);
  const aiCoverage = getPercentage(aiEvaluatedTotal, scannedTotal);
  const reviewQueueEstimate = Math.max(riskTotal - reviewedTotal, 0);

  const cards = useMemo(() => ([
    {
      title: 'Emailuri scanate',
      value: scannedTotal,
      helper: syncedTotal > 0
        ? `${scanCoverage}% raportat la emailurile sincronizate luna aceasta`
        : 'Rezultate de scanare din luna selectată',
      icon: <EmailRoundedIcon fontSize="small" />,
      accentColor: 'primary.main',
      progress: scanCoverage,
      eyebrow: 'Activitate',
    },
    {
      title: 'De verificat',
      value: reviewQueueEstimate,
      helper: 'Suspecte sau probabil phishing, fără verdict manual',
      icon: <WarningAmberRoundedIcon fontSize="small" />,
      accentColor: reviewQueueEstimate > 0 ? 'warning.main' : 'success.main',
      progress: getPercentage(reviewQueueEstimate, scannedTotal),
      eyebrow: 'Review',
    },
    {
      title: 'Probabil phishing',
      value: likelyPhishingTotal,
      helper: 'Risc ridicat calculat de motorul backend',
      icon: <DangerousRoundedIcon fontSize="small" />,
      accentColor: 'error.main',
      progress: getPercentage(likelyPhishingTotal, scannedTotal),
      eyebrow: 'Verdict',
    },
    {
      title: 'Revizuite manual',
      value: reviewedTotal,
      helper: `${manualReviewRate}% din scanări au primit verdict manual`,
      icon: <ReviewsRoundedIcon fontSize="small" />,
      accentColor: 'primary.main',
      progress: manualReviewRate,
      eyebrow: 'Review',
    },
    {
      title: 'Confirmate phishing',
      value: markedPhishingTotal,
      helper: 'Emailuri confirmate manual ca atac',
      icon: <FactCheckRoundedIcon fontSize="small" />,
      accentColor: 'error.main',
      progress: getPercentage(markedPhishingTotal, reviewedTotal),
      eyebrow: 'Manual',
    },
  ]), [
    likelyPhishingTotal,
    manualReviewRate,
    markedPhishingTotal,
    reviewedTotal,
    reviewQueueEstimate,
    scanCoverage,
    scannedTotal,
    syncedTotal,
  ]);

  const verdictChartData = useMemo(() => ([
    {
      key: 'safe',
      label: 'Sigur',
      value: safeTotal,
      color: '#4ade80',
    },
    {
      key: 'suspicious',
      label: 'Suspect',
      value: suspiciousTotal,
      color: '#f59e0b',
    },
    {
      key: 'likely_phishing',
      label: 'Probabil phishing',
      value: likelyPhishingTotal,
      color: '#f87171',
    },
  ]), [likelyPhishingTotal, safeTotal, suspiciousTotal]);

  const aiChartData = useMemo(() => ([
    {
      key: 'evaluated',
      label: 'Procesate de AI',
      value: aiEvaluatedTotal,
      color: '#38bdf8',
    },
    {
      key: 'failed',
      label: 'Esuate',
      value: aiFailedTotal,
      color: '#f87171',
    },
    {
      key: 'disabled',
      label: 'AI oprit',
      value: aiDisabledTotal,
      color: '#f59e0b',
    },
  ]), [aiDisabledTotal, aiEvaluatedTotal, aiFailedTotal]);

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value || getCurrentMonthValue());
  };

  const handleSendDigest = useCallback(async () => {
    setIsSending(true);
    setDeliveryState({
      status: 'sending',
      result: null,
      error: null,
    });

    try {
      const result = await sendMonthlySummaryDigest({ month: selectedMonth });

      setDeliveryState({
        status: result?.sent === false ? 'failed' : 'sent',
        result,
        error: null,
      });
    } catch (error) {
      setDeliveryState({
        status: 'failed',
        result: buildDigestFailureResult(error),
        error,
      });
    } finally {
      setIsSending(false);
    }
  }, [selectedMonth]);

  return (
    <Container maxWidth={false} disableGutters sx={{ width: '100%' }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography component="h1" variant="h5" fontWeight={900}>
              Rapoarte lunare de securitate
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 820, fontSize: { xs: '0.95rem', md: '1rem' } }}
            >
              Sumar pentru verdicturi, review manual, reguli euristice și semnale AI.
              Digestul poate fi trimis după verificarea datelor.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <TextField
              type="month"
              label="Luna raportului"
              value={selectedMonth}
              onChange={handleMonthChange}
              size="small"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              sx={{
                minWidth: { xs: '100%', sm: 190 },
              }}
            />

            <Button
              variant="outlined"
              color="inherit"
              startIcon={
                isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshRoundedIcon />
              }
              onClick={loadSummary}
              disabled={isLoading || isSending}
              sx={{
                minWidth: 178,
                borderColor: 'rgba(148, 163, 184, 0.26)',
              }}
            >
              Actualizeaza raport
            </Button>
          </Stack>
        </Stack>

        {loadError ? (
          <ErrorMessage
            error={loadError}
            title="Raportul nu a putut fi incarcat"
            onRetry={loadSummary}
          />
        ) : null}

        {isLoading && !summary ? (
          <LoadingState message="Se incarca raportul lunar..." minHeight={220} />
        ) : !summary && !loadError ? (
          <EmptyState
            title="Nu exista raport pentru luna selectata"
            description="Alege alta luna sau sincronizeaza emailuri inainte de a verifica raportul."
            icon={<CalendarMonthRoundedIcon fontSize="large" />}
          />
        ) : summary ? (
          <>
            <Box
              sx={{
                maxWidth: '100%',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: 2,
                  p: { xs: 2, md: 2.5 },
                  background:
                    'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.84) 100%)',
                }}
              >
                <Stack spacing={2.25}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Stack spacing={0.75}>
                      <Typography variant="overline" color="text.secondary" fontWeight={900}>
                        Perioada raportului
                      </Typography>
                      <Typography variant="h5" fontWeight={900}>
                        {formatMonthLabel(period.month || selectedMonth)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(period.from)} - {formatDate(period.to)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={`Generat: ${formatDateTime(summary.generatedAt)}`}
                        sx={{
                          borderRadius: 1,
                          bgcolor: 'rgba(148, 163, 184, 0.1)',
                          color: 'text.secondary',
                          fontWeight: 800,
                        }}
                      />
                      <Chip
                        label={`${formatNumber(scannedTotal)} scanate`}
                        sx={{
                          borderRadius: 1,
                          bgcolor: 'rgba(34, 197, 94, 0.1)',
                          color: 'secondary.main',
                          fontWeight: 800,
                        }}
                      />
                      <Chip
                        label={`${riskShare}% risc`}
                        sx={{
                          borderRadius: 1,
                          bgcolor: riskShare > 0
                            ? 'rgba(245, 158, 11, 0.13)'
                            : 'rgba(74, 222, 128, 0.12)',
                          color: riskShare > 0 ? 'warning.main' : 'success.main',
                          fontWeight: 800,
                        }}
                      />
                    </Stack>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                      gap: 1,
                    }}
                  >
                    {[
                      ['Nivel de risc', riskShare > 0 ? `${riskShare}% risc` : 'fara risc detectat', riskShare > 0 ? '#f59e0b' : '#4ade80'],
                      ['De verificat', reviewQueueEstimate, reviewQueueEstimate > 0 ? '#f59e0b' : '#4ade80'],
                      ['Acoperire AI', `${aiCoverage}%`, aiCoverage > 0 ? '#38bdf8' : '#94a3b8'],
                    ].map(([label, value, color]) => (
                      <Box
                        key={label}
                        sx={{
                          border: '1px solid rgba(148, 163, 184, 0.12)',
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 1.15,
                          bgcolor: 'rgba(2, 6, 23, 0.24)',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={900}>
                          {label}
                        </Typography>
                        <Typography variant="h6" fontWeight={900} sx={{ color }}>
                          {typeof value === 'number' ? formatNumber(value) : value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </Paper>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  xl: 'repeat(5, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {cards.map((card) => (
                <MonthlySummaryCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  helper={card.helper}
                  icon={card.icon}
                  accentColor={card.accentColor}
                  progress={card.progress}
                  eyebrow={card.eyebrow}
                  isLoading={isLoading}
                />
              ))}
            </Box>

            <ReportDeliveryStatus
              status={deliveryState.status}
              result={deliveryState.result}
              error={deliveryState.error}
              selectedMonth={selectedMonth}
              summary={summary}
              onSend={handleSendDigest}
              isSending={isSending}
              disabled={isLoading || isSending || !summary}
            />

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
              <RiskDistributionChart
                title="Distributie verdicturi"
                subtitle="Verdicturile automate salvate de backend pentru luna selectata."
                data={verdictChartData}
                centerLabel="scanari"
                footerLabel="Emailuri cu risc"
                footerValue={`${formatNumber(riskTotal)} (${riskShare}%)`}
                insights={[
                  {
                    label: 'Carantinate',
                    value: quarantinedTotal,
                    color: quarantinedTotal > 0 ? '#f59e0b' : '#4ade80',
                  },
                  {
                    label: 'Confirmate phishing',
                    value: markedPhishingTotal,
                    color: markedPhishingTotal > 0 ? '#f87171' : '#94a3b8',
                  },
                ]}
                isLoading={isLoading}
              />

              <RiskDistributionChart
                title="Status AI"
                subtitle="Diagnostic pentru Ollama. Chiar și cu AI oprit, scanarea euristică rulează în continuare."
                chartType="bar"
                data={aiChartData}
                footerLabel="Acoperire AI"
                footerValue={`${aiCoverage}%`}
                insights={[
                  {
                    label: 'Esuate',
                    value: aiFailedTotal,
                    color: aiFailedTotal > 0 ? '#f87171' : '#4ade80',
                  },
                  {
                    label: 'AI oprit',
                    value: aiDisabledTotal,
                    color: aiDisabledTotal > 0 ? '#f59e0b' : '#94a3b8',
                  },
                ]}
                isLoading={isLoading}
                emptyTitle="Nu exista status AI"
                emptyDescription="Statusurile AI apar dupa ce exista scanari in luna selectata."
              />
            </Box>

            <TopRulesList
              rules={summary.topTriggeredRules}
              isLoading={isLoading}
            />
          </>
        ) : null}
      </Stack>
    </Container>
  );
};

export default ReportsPage;
