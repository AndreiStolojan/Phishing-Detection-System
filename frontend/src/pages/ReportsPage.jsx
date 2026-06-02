import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import { getMonthlySummary, sendMonthlySummary } from '../api/reportsApi.js';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import MonthlySummaryCard from '../components/reports/MonthlySummaryCard.jsx';
import TopRulesList from '../components/reports/TopRulesList.jsx';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sendStatus, setSendStatus] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMonthlySummary(month);
        if (active) {
          setSummary(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [month]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setSendStatus(null);

    try {
      const result = await sendMonthlySummary(month);
      setSendStatus(`Digest sent to ${result.recipient}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 980 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Security reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monthly security summary based on synced emails and current scans.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            label="Month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            size="small"
          />
          <Button startIcon={<SendOutlinedIcon />} variant="outlined" onClick={handleSend} disabled={sending}>
            Send digest
          </Button>
          {sendStatus ? (
            <Typography variant="body2" color="success.main">
              {sendStatus}
            </Typography>
          ) : null}
        </Stack>

        <ErrorMessage message={error} />
        {loading ? <LoadingState label="Loading report" /> : <MonthlySummaryCard summary={summary} />}

        <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
            Top triggered rules
          </Typography>
          <TopRulesList rules={summary?.topTriggeredRules || []} />
        </Paper>
      </Stack>
    </Box>
  );
}
