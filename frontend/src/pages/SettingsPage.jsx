import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormHelperText,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';

import { getMailAccounts, updateMailAccountSettings } from '../api/mailAccountsApi.js';
import { updateAiSettings, updateCurrentUser } from '../api/usersApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorMessage, { getErrorMessage } from '../components/common/ErrorMessage.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { useAuth } from '../hooks/useAuth.js';

const panelSx = {
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: 2,
  bgcolor: 'rgba(15, 23, 42, 0.88)',
  p: { xs: 2.25, sm: 3 },
};

const nestedPanelSx = {
  border: '1px solid rgba(148, 163, 184, 0.14)',
  borderRadius: 2,
  bgcolor: 'rgba(2, 6, 23, 0.28)',
  p: 2,
};

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;
const AVATAR_OUTPUT_LIMIT_CHARS = 700 * 1024;
const AVATAR_TARGET_SIZES = [512, 384, 256];
const AVATAR_QUALITIES = [0.86, 0.76, 0.66, 0.56];

const getAccountId = (account) => account?._id ?? account?.id ?? null;

const formatFileSize = (bytes) => {
  const megabytes = bytes / (1024 * 1024);

  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
};

const getInitials = (user) => {
  const source = user?.name || user?.email || 'Utilizator';
  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
};

const loadImageFromUrl = (url) => new Promise((resolve, reject) => {
  const image = new Image();

  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Imaginea nu a putut fi citită.'));
  image.src = url;
});

const renderAvatarDataUrl = (image, targetSize, quality) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceSize = Math.min(sourceWidth, sourceHeight);

  if (!sourceSize) {
    throw new Error('Imaginea selectată nu pare validă.');
  }

  const outputSize = Math.min(targetSize, sourceSize);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Browserul nu poate procesa imaginea local.');
  }

  canvas.width = outputSize;
  canvas.height = outputSize;

  context.fillStyle = '#0f172a';
  context.fillRect(0, 0, outputSize, outputSize);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const sourceX = Math.max(0, (sourceWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (sourceHeight - sourceSize) / 2);

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas.toDataURL('image/jpeg', quality);
};

const resizeAvatarFileToDataUrl = async (file) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromUrl(objectUrl);
    let smallestDataUrl = null;

    for (const targetSize of AVATAR_TARGET_SIZES) {
      for (const quality of AVATAR_QUALITIES) {
        const dataUrl = renderAvatarDataUrl(image, targetSize, quality);

        smallestDataUrl = !smallestDataUrl || dataUrl.length < smallestDataUrl.length
          ? dataUrl
          : smallestDataUrl;

        if (dataUrl.length <= AVATAR_OUTPUT_LIMIT_CHARS) {
          return dataUrl;
        }
      }
    }

    return smallestDataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const getUserAiEnabled = (nextUser) => Boolean(
  nextUser?.settings?.aiEnabled ?? nextUser?.aiEnabled ?? false
);

const getAccountSyncMaxResults = (account) => account?.syncMaxResults ?? 10;

const buildAccountFormState = (accounts) => accounts.reduce((forms, account) => {
  const accountId = getAccountId(account);

  if (!accountId) {
    return forms;
  }

  return {
    ...forms,
    [accountId]: String(getAccountSyncMaxResults(account)),
  };
}, {});

const getSyncMaxResultsError = (value) => {
  const normalizedValue = String(value ?? '').trim();
  const numericValue = Number(normalizedValue);

  if (!normalizedValue) {
    return 'Introdu o valoare intre 1 si 50.';
  }

  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 50) {
    return 'Valoarea trebuie sa fie un numar intreg intre 1 si 50.';
  }

  return '';
};

const getProviderLabel = (provider) => {
  if (!provider) {
    return 'Provider necunoscut';
  }

  if (provider === 'google' || provider === 'gmail') {
    return 'Gmail';
  }

  return provider;
};

const getStatusLabel = (status) => {
  if (!status) {
    return 'status necunoscut';
  }

  if (status === 'active') {
    return 'activ';
  }

  return status;
};

const getUpdatedAccountFromResponse = (response) => (
  response?.mailAccount ?? response?.account ?? response
);

const mergeAiEnabledIntoUser = (baseUser, aiEnabled) => ({
  ...(baseUser ?? {}),
  settings: {
    ...(baseUser?.settings ?? {}),
    aiEnabled,
  },
});

const SettingsPage = () => {
  const { user, refreshCurrentUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);
  const [name, setName] = useState(user?.name ?? '');
  const [avatarDataUrl, setAvatarDataUrl] = useState(user?.avatarDataUrl ?? '');
  const [avatarError, setAvatarError] = useState(null);
  const [isAvatarProcessing, setIsAvatarProcessing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(() => getUserAiEnabled(user));
  const [mailAccounts, setMailAccounts] = useState([]);
  const [accountForms, setAccountForms] = useState({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [isAiSaving, setIsAiSaving] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuccess, setAiSuccess] = useState(null);
  const [savingAccountId, setSavingAccountId] = useState(null);
  const [accountErrors, setAccountErrors] = useState({});
  const [accountSuccess, setAccountSuccess] = useState({});

  const applyUserState = useCallback((nextUser) => {
    if (!nextUser) {
      return;
    }

    setCurrentUser(nextUser);
    setName(nextUser.name ?? '');
    setAvatarDataUrl(nextUser.avatarDataUrl ?? '');
    setAiEnabled(getUserAiEnabled(nextUser));
  }, []);

  useEffect(() => {
    applyUserState(user);
  }, [applyUserState, user]);

  const refreshUserAfterUpdate = useCallback(async (fallbackUser) => {
    let nextUser = fallbackUser;

    if (typeof refreshCurrentUser === 'function') {
      try {
        nextUser = (await refreshCurrentUser()) ?? fallbackUser;
      } catch {
        nextUser = fallbackUser;
      }
    }

    applyUserState(nextUser);

    return nextUser;
  }, [applyUserState, refreshCurrentUser]);

  const loadMailAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    setLoadError(null);

    try {
      const accounts = await getMailAccounts();
      const nextAccounts = Array.isArray(accounts) ? accounts : [];

      setMailAccounts(nextAccounts);
      setAccountForms(buildAccountFormState(nextAccounts));
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadMailAccounts();
  }, [loadMailAccounts]);

  const normalizedName = name.trim();
  const savedName = currentUser?.name ?? '';
  const savedAvatarDataUrl = currentUser?.avatarDataUrl ?? '';
  const isAvatarDirty = avatarDataUrl !== savedAvatarDataUrl;
  const isProfileDirty = normalizedName !== savedName.trim() || isAvatarDirty;
  const isNameInvalid = normalizedName.length === 0;
  const displayEmail = currentUser?.email || 'Email indisponibil';
  const avatarInitials = useMemo(() => getInitials({
    ...currentUser,
    name,
  }), [currentUser, name]);

  const sortedMailAccounts = useMemo(() => [...mailAccounts].sort((first, second) => {
    const firstLabel = first?.accountEmail || first?.provider || '';
    const secondLabel = second?.accountEmail || second?.provider || '';

    return firstLabel.localeCompare(secondLabel);
  }), [mailAccounts]);

  const handleAvatarFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    setAvatarError(null);
    setProfileError(null);
    setProfileSuccess(null);

    if (!file.type?.startsWith('image/')) {
      setAvatarError('Alege un fișier imagine valid.');
      return;
    }

    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
      setAvatarError(`Imaginea trebuie să fie sub ${formatFileSize(MAX_AVATAR_UPLOAD_BYTES)}.`);
      return;
    }

    setIsAvatarProcessing(true);

    try {
      const nextAvatarDataUrl = await resizeAvatarFileToDataUrl(file);

      setAvatarDataUrl(nextAvatarDataUrl);
    } catch (error) {
      setAvatarError(error?.message || 'Nu am putut procesa imaginea local.');
    } finally {
      setIsAvatarProcessing(false);
    }
  }, []);

  const handleAvatarRemove = useCallback(() => {
    setAvatarDataUrl('');
    setAvatarError(null);
    setProfileError(null);
    setProfileSuccess(null);
  }, []);

  const handleProfileSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (isNameInvalid) {
      setProfileError('Numele nu poate fi gol.');
      setProfileSuccess(null);
      return;
    }

    setIsProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const payload = {
        name: normalizedName,
      };

      if (isAvatarDirty) {
        payload.avatarDataUrl = avatarDataUrl || null;
      }

      const updatedUser = await updateCurrentUser(payload);

      await refreshUserAfterUpdate(updatedUser);
      setProfileSuccess('Profilul a fost actualizat.');
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsProfileSaving(false);
    }
  }, [avatarDataUrl, isAvatarDirty, isNameInvalid, normalizedName, refreshUserAfterUpdate]);

  const handleAiToggle = useCallback(async (event) => {
    const nextAiEnabled = event.target.checked;
    const previousAiEnabled = aiEnabled;

    setAiEnabled(nextAiEnabled);
    setIsAiSaving(true);
    setAiError(null);
    setAiSuccess(null);

    try {
      const result = await updateAiSettings(nextAiEnabled);
      const savedAiEnabled = Boolean(result?.aiEnabled ?? nextAiEnabled);
      const fallbackUser = mergeAiEnabledIntoUser(currentUser, savedAiEnabled);

      await refreshUserAfterUpdate(fallbackUser);
      setAiSuccess(savedAiEnabled
        ? 'Explicațiile AI au fost pornite.'
        : 'Explicațiile AI au fost oprite.');
    } catch (error) {
      setAiEnabled(previousAiEnabled);
      setAiError(getErrorMessage(error));
    } finally {
      setIsAiSaving(false);
    }
  }, [aiEnabled, currentUser, refreshUserAfterUpdate]);

  const handleAccountInputChange = useCallback((accountId, value) => {
    setAccountForms((previousForms) => ({
      ...previousForms,
      [accountId]: value,
    }));

    setAccountErrors((previousErrors) => ({
      ...previousErrors,
      [accountId]: null,
    }));

    setAccountSuccess((previousSuccess) => ({
      ...previousSuccess,
      [accountId]: null,
    }));
  }, []);

  const handleSaveAccountSettings = useCallback(async (account) => {
    const accountId = getAccountId(account);

    if (!accountId) {
      return;
    }

    const rawSyncMaxResults = accountForms[accountId] ?? '';
    const validationError = getSyncMaxResultsError(rawSyncMaxResults);

    if (validationError) {
      setAccountErrors((previousErrors) => ({
        ...previousErrors,
        [accountId]: validationError,
      }));
      setAccountSuccess((previousSuccess) => ({
        ...previousSuccess,
        [accountId]: null,
      }));
      return;
    }

    const syncMaxResults = Number(rawSyncMaxResults);

    setSavingAccountId(accountId);
    setAccountErrors((previousErrors) => ({
      ...previousErrors,
      [accountId]: null,
    }));
    setAccountSuccess((previousSuccess) => ({
      ...previousSuccess,
      [accountId]: null,
    }));

    try {
      const response = await updateMailAccountSettings(accountId, { syncMaxResults });
      const updatedAccount = getUpdatedAccountFromResponse(response) ?? {
        ...account,
        syncMaxResults,
      };

      setMailAccounts((previousAccounts) => previousAccounts.map((previousAccount) => (
        getAccountId(previousAccount) === accountId
          ? { ...previousAccount, ...updatedAccount, syncMaxResults: updatedAccount.syncMaxResults ?? syncMaxResults }
          : previousAccount
      )));
      setAccountForms((previousForms) => ({
        ...previousForms,
        [accountId]: String(updatedAccount.syncMaxResults ?? syncMaxResults),
      }));
      setAccountSuccess((previousSuccess) => ({
        ...previousSuccess,
        [accountId]: 'Setarea de sync a fost salvată.',
      }));
    } catch (error) {
      setAccountErrors((previousErrors) => ({
        ...previousErrors,
        [accountId]: getErrorMessage(error),
      }));
    } finally {
      setSavingAccountId(null);
    }
  }, [accountForms]);

  return (
    <Box sx={{ maxWidth: 1080 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography component="h1" variant="h5" fontWeight={800}>
              Setări
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
              Administrează profilul, explicațiile AI și limita de emailuri sincronizate
              pentru fiecare cont conectat.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={isLoadingAccounts ? <CircularProgress size={16} color="inherit" /> : <RefreshRoundedIcon />}
            onClick={loadMailAccounts}
            disabled={isLoadingAccounts}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            Refresh conturi
          </Button>
        </Stack>

        <Paper elevation={0} sx={panelSx}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: 'rgba(56, 189, 248, 0.1)',
                }}
              >
                <AccountCircleRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h2" variant="h6" fontWeight={800}>
                  Profil
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                  {displayEmail}
                </Typography>
              </Box>
            </Stack>

            {profileError ? <Alert severity="error">{profileError}</Alert> : null}
            {profileSuccess ? <Alert severity="success">{profileSuccess}</Alert> : null}

            <Box component="form" onSubmit={handleProfileSubmit}>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Avatar
                    src={avatarDataUrl || undefined}
                    alt={normalizedName || displayEmail}
                    sx={{
                      width: 88,
                      height: 88,
                      bgcolor: 'rgba(56, 189, 248, 0.14)',
                      border: '1px solid rgba(56, 189, 248, 0.34)',
                      color: 'primary.main',
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {avatarInitials}
                  </Avatar>

                  <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                      <Button
                        component="label"
                        variant="outlined"
                        color="inherit"
                        startIcon={isAvatarProcessing ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <PhotoCameraRoundedIcon />
                        )}
                        disabled={isProfileSaving || isAvatarProcessing}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Încarcă avatar
                        <Box
                          component="input"
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleAvatarFileChange}
                        />
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        startIcon={<DeleteRoundedIcon />}
                        onClick={handleAvatarRemove}
                        disabled={isProfileSaving || isAvatarProcessing || !avatarDataUrl}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Elimină
                      </Button>
                    </Stack>

                    <FormHelperText error={Boolean(avatarError)} sx={{ m: 0 }}>
                      {avatarError || `Imagine locală, redimensionată în browser. Maxim ${formatFileSize(MAX_AVATAR_UPLOAD_BYTES)}.`}
                    </FormHelperText>
                  </Stack>
                </Stack>

                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', md: 'flex-start' }}
                >
                  <TextField
                    label="Nume"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setProfileError(null);
                      setProfileSuccess(null);
                    }}
                    error={Boolean(profileError && isNameInvalid)}
                    helperText="Numele apare în bara de sus și în profilul utilizatorului."
                    disabled={isProfileSaving}
                    fullWidth
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isProfileSaving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                    disabled={isProfileSaving || isAvatarProcessing || !isProfileDirty || isNameInvalid}
                    sx={{ minWidth: 150, minHeight: 54 }}
                  >
                    Salvează
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={panelSx}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: aiEnabled ? 'success.main' : 'text.secondary',
                    bgcolor: 'rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <SmartToyRoundedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography component="h2" variant="h6" fontWeight={800}>
                    Explicații AI
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verdictul rămâne calculat de regulile backend-ului.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                {isAiSaving ? <CircularProgress size={18} /> : null}
                <Chip
                  color={aiEnabled ? 'success' : 'default'}
                  variant={aiEnabled ? 'filled' : 'outlined'}
                  label={aiEnabled ? 'Pornit' : 'Oprit'}
                  sx={{ fontWeight: 800 }}
                />
                <Switch
                  checked={aiEnabled}
                  onChange={handleAiToggle}
                  disabled={isAiSaving}
                  inputProps={{ 'aria-label': 'Comută explicațiile AI' }}
                />
              </Stack>
            </Stack>

            {aiError ? <Alert severity="error">{aiError}</Alert> : null}
            {aiSuccess ? <Alert severity="success">{aiSuccess}</Alert> : null}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={panelSx}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'secondary.main',
                  bgcolor: 'rgba(34, 197, 94, 0.1)',
                }}
              >
                <EmailRoundedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography component="h2" variant="h6" fontWeight={800}>
                  Conturi email
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sync max controlează câte emailuri citește backend-ul la o sincronizare.
                </Typography>
              </Box>
            </Stack>

            {loadError ? (
              <ErrorMessage
                error={loadError}
                onRetry={loadMailAccounts}
                title="Nu am putut încărca lista de conturi."
              />
            ) : null}

            {isLoadingAccounts && sortedMailAccounts.length === 0 ? (
              <LoadingState message="Se încarcă setările conturilor..." />
            ) : null}

            {!isLoadingAccounts && !loadError && sortedMailAccounts.length === 0 ? (
              <EmptyState
                title="Nu există conturi email conectate"
                description="Conectarea Gmail se face din Dashboard. După conectare, setarea syncMaxResults apare aici."
                icon={<EmailRoundedIcon fontSize="large" />}
              />
            ) : null}

            {sortedMailAccounts.length > 0 ? (
              <Stack spacing={2}>
                {sortedMailAccounts.map((account) => {
                  const accountId = getAccountId(account);
                  const formValue = accountForms[accountId] ?? '';
                  const validationError = getSyncMaxResultsError(formValue);
                  const savedValue = String(getAccountSyncMaxResults(account));
                  const isDirty = formValue !== savedValue;
                  const isSaving = savingAccountId === accountId;
                  const accountError = accountErrors[accountId] || '';
                  const accountMessage = accountSuccess[accountId] || '';

                  return (
                    <Box key={accountId ?? account.accountEmail} sx={nestedPanelSx}>
                      <Stack spacing={2}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          alignItems={{ xs: 'stretch', md: 'flex-start' }}
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>
                              {account.accountEmail || 'Email necunoscut'}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                              <Chip size="small" label={getProviderLabel(account.provider)} />
                              <Chip
                                size="small"
                                color={account.status === 'active' ? 'success' : 'warning'}
                                label={`Status: ${getStatusLabel(account.status)}`}
                              />
                            </Stack>
                          </Box>

                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                            sx={{ minWidth: { md: 340 } }}
                          >
                            <TextField
                              label="Sync max"
                              type="number"
                              value={formValue}
                              onChange={(event) => handleAccountInputChange(accountId, event.target.value)}
                              error={Boolean(accountError || validationError)}
                              helperText={accountError || validationError || 'Interval permis: 1-50'}
                              disabled={isSaving || !accountId}
                              inputProps={{ min: 1, max: 50, step: 1 }}
                              sx={{ maxWidth: { sm: 180 } }}
                              fullWidth
                            />
                            <Button
                              variant="outlined"
                              color="inherit"
                              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                              onClick={() => handleSaveAccountSettings(account)}
                              disabled={isSaving || !accountId || !isDirty || Boolean(validationError)}
                              sx={{ minHeight: 54, minWidth: 116 }}
                            >
                              Salvează
                            </Button>
                          </Stack>
                        </Stack>

                        {accountMessage ? (
                          <>
                            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.12)' }} />
                            <Alert severity="success">{accountMessage}</Alert>
                          </>
                        ) : null}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default SettingsPage;
