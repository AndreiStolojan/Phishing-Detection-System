import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import { getEmails } from '../api/emailsApi.js';
import { getMailAccounts } from '../api/mailAccountsApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorMessage, { getErrorMessage } from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import EmailList from '../components/emails/EmailList.jsx';
import { formatProvider, formatProviderActionStatus, riskBucketOptions } from '../utils/formatRisk.js';

const DEFAULT_LIMIT = 10;

const emptyPagination = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

const normalizePagination = (pagination, fallbackPage) => {
  const page = Number(pagination?.page ?? fallbackPage) || fallbackPage;
  const limit = Number(pagination?.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const total = Number(pagination?.total ?? 0) || 0;
  const totalPages = Math.max(1, Number(pagination?.totalPages ?? 1) || 1);

  return {
    page,
    limit,
    total,
    totalPages,
  };
};

const EmailsPage = () => {
  const [emails, setEmails] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [riskBucket, setRiskBucket] = useState('all');
  const [mailAccountId, setMailAccountId] = useState('all');
  const [mailAccounts, setMailAccounts] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const hasActiveFilters =
    riskBucket !== 'all' || mailAccountId !== 'all' || query.trim().length > 0;

  const loadEmails = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getEmails({
        page,
        limit: DEFAULT_LIMIT,
        q: query.trim(),
        riskBucket,
        mailAccountId: mailAccountId === 'all' ? undefined : mailAccountId,
      });

      setEmails(Array.isArray(result?.items) ? result.items : []);
      setPagination(normalizePagination(result?.pagination, page));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [mailAccountId, page, query, riskBucket]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    let isMounted = true;

    getMailAccounts()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result)
            ? result
            : [];

        setMailAccounts(items);
      })
      .catch(() => {
        if (isMounted) {
          setMailAccounts([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentPage = pagination.page || page;
  const totalPages = pagination.totalPages || 1;
  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  const pageSummary = useMemo(() => {
    const total = pagination.total || 0;

    if (total === 0) {
      return '0 emailuri';
    }

    const start = ((currentPage - 1) * pagination.limit) + 1;
    const end = Math.min(currentPage * pagination.limit, total);

    return `${start}-${end} din ${total} emailuri`;
  }, [currentPage, pagination.limit, pagination.total]);

  const gmailAccountOptions = useMemo(() => (
    mailAccounts
      .filter((account) => account?._id)
      .map((account) => ({
        value: account._id,
        label: account.accountEmail || account.email || 'Cont Gmail fara email',
        meta: `${formatProvider(account.provider)}${
          account.status ? ` - ${formatProviderActionStatus(account.status)}` : ''
        }`,
      }))
  ), [mailAccounts]);

  const handleRiskBucketChange = (_, nextRiskBucket) => {
    setRiskBucket(nextRiskBucket);
    setPage(1);
  };

  const handleMailAccountChange = (event) => {
    setMailAccountId(event.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setQuery('');
    setPage(1);
  };

  const handleResetFilters = () => {
    setRiskBucket('all');
    setMailAccountId('all');
    setSearchInput('');
    setQuery('');
    setPage(1);
  };

  const handlePreviousPage = () => {
    setPage((value) => Math.max(1, value - 1));
  };

  const handleNextPage = () => {
    setPage((value) => Math.min(totalPages, value + 1));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingState
          message="Se incarca emailurile..."
          minHeight={220}
        />
      );
    }

    if (loadError) {
      return (
        <ErrorMessage
          message={loadError}
          onRetry={loadEmails}
          title="Lista de emailuri nu a putut fi incarcata"
        />
      );
    }

    if (emails.length === 0) {
      return (
        <EmptyState
          title={hasActiveFilters ? 'Nu exista emailuri pentru filtrele alese' : 'Nu exista emailuri sincronizate'}
          description={
            hasActiveFilters
              ? 'Schimba filtrul de risc sau cautarea ca sa vezi alte emailuri.'
              : 'Dupa conectarea contului Gmail si sincronizare, emailurile vor aparea aici.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outlined" color="inherit" onClick={handleResetFilters}>
                Reseteaza filtrele
              </Button>
            ) : null
          }
        />
      );
    }

    return <EmailList emails={emails} />;
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        py: { xs: 3, md: 4 },
      }}
    >
      <Container maxWidth={false} disableGutters sx={{ width: '100%' }}>
        <Stack spacing={2.5} sx={{ width: '100%' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
            spacing={2}
          >
            <Box>
              <Typography component="h1" variant="h4" fontWeight={800}>
                Emailuri
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 820 }}>
                Inbox-ul sincronizat pentru demonstratia MVP: filtrezi rapid dupa risc,
                cont Gmail si text, apoi intri in detalii pentru explicatii si review manual.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadEmails}
              disabled={isLoading}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              Reincarca
            </Button>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: 1,
              bgcolor: 'rgba(15, 23, 42, 0.82)',
              p: { xs: 1.5, sm: 2 },
            }}
          >
            <Stack spacing={2}>
              <Tabs
                value={riskBucket}
                onChange={handleRiskBucketChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Filtru dupa risc"
                sx={{
                  minHeight: 40,
                  '& .MuiTab-root': {
                    minHeight: 40,
                    px: 1.5,
                    color: 'text.secondary',
                    fontWeight: 800,
                  },
                  '& .Mui-selected': {
                    color: 'primary.main',
                  },
                }}
              >
                {riskBucketOptions.map((option) => (
                  <Tab
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    disableRipple
                  />
                ))}
              </Tabs>

              <Stack
                component="form"
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
                onSubmit={handleSearchSubmit}
              >
                <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 280 } }}>
                  <InputLabel id="mail-account-filter-label">Cont Gmail</InputLabel>
                  <Select
                    labelId="mail-account-filter-label"
                    label="Cont Gmail"
                    value={mailAccountId}
                    onChange={handleMailAccountChange}
                    disabled={isLoading}
                  >
                    <MenuItem value="all">Toate conturile Gmail</MenuItem>
                    {gmailAccountOptions.map((account) => (
                      <MenuItem key={account.value} value={account.value}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {account.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {account.meta}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  size="small"
                  label="Cauta in emailuri"
                  placeholder="Subiect, expeditor sau text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: searchInput ? (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Sterge cautarea"
                          edge="end"
                          size="small"
                          onClick={handleClearSearch}
                        >
                          <ClearRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />

                <Stack direction="row" spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SearchRoundedIcon />}
                    disabled={isLoading}
                    sx={{ minWidth: 112 }}
                  >
                    Cauta
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    color="inherit"
                    onClick={handleResetFilters}
                    disabled={!hasActiveFilters || isLoading}
                  >
                    Reseteaza
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: 1,
              bgcolor: 'rgba(2, 6, 23, 0.26)',
              p: { xs: 1.5, sm: 2 },
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={1}
              >
                <Typography variant="body2" color="text.secondary">
                  {pageSummary}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={handlePreviousPage}
                    disabled={!canGoPrevious}
                  >
                    Inapoi
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 96, textAlign: 'center' }}
                  >
                    Pagina {currentPage} din {totalPages}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={handleNextPage}
                    disabled={!canGoNext}
                  >
                    Inainte
                  </Button>
                </Stack>
              </Stack>

              {renderContent()}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default EmailsPage;
