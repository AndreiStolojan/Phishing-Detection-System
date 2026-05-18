import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';

import { sendContactMessage } from '../../api/contactApi.js';
import { getErrorMessage } from '../common/ErrorMessage.jsx';

const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1500;

const dateTimeFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(15, 23, 42, 0.72)',
  },
};

const formatDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date);
};

const normalizeContactResponse = (response) => {
  const nestedMessage = response?.message && typeof response.message === 'object'
    ? response.message
    : {};

  return {
    sent: response?.sent ?? nestedMessage.sent ?? true,
    recipient: response?.recipient ?? response?.to ?? nestedMessage.recipient ?? nestedMessage.to ?? null,
    messageId: response?.messageId ?? response?.id ?? nestedMessage.messageId ?? nestedMessage.id ?? null,
    generatedAt: response?.generatedAt ?? response?.createdAt ?? nestedMessage.generatedAt ?? nestedMessage.createdAt ?? null,
    message: typeof response?.message === 'string' ? response.message : null,
  };
};

const MotionBox = motion(Box);

export const SupportChatDrawer = ({
  open,
  onClose,
}) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sentResult, setSentResult] = useState(null);

  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const subjectTooLong = trimmedSubject.length > MAX_SUBJECT_LENGTH;
  const messageTooLong = trimmedMessage.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmedMessage.length > 0 && !subjectTooLong && !messageTooLong && !isSending;

  const successDetails = useMemo(() => {
    if (!sentResult) {
      return [];
    }

    return [
      sentResult.recipient ? `Destinatar: ${sentResult.recipient}` : null,
      sentResult.messageId ? `ID mesaj: ${sentResult.messageId}` : null,
      sentResult.generatedAt ? `Generat: ${formatDateTime(sentResult.generatedAt)}` : null,
    ].filter(Boolean);
  }, [sentResult]);

  const handleClear = useCallback(() => {
    setSubject('');
    setMessage('');
    setSendError(null);
    setSentResult(null);
  }, []);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (!trimmedMessage) {
      setSendError('Scrie mesajul înainte de trimitere.');
      setSentResult(null);
      return;
    }

    if (subjectTooLong || messageTooLong) {
      setSendError('Mesajul sau subiectul depășește limita permisă.');
      setSentResult(null);
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSentResult(null);

    try {
      const response = await sendContactMessage({
        subject: trimmedSubject,
        message: trimmedMessage,
      });
      const normalizedResponse = normalizeContactResponse(response);

      if (normalizedResponse.sent === false) {
        throw new Error(normalizedResponse.message || 'Mesajul nu a fost trimis.');
      }

      setSentResult(normalizedResponse);
      setSubject('');
      setMessage('');
    } catch (error) {
      setSendError(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }, [messageTooLong, subjectTooLong, trimmedMessage, trimmedSubject]);

  return (
    <Drawer
      anchor="right"
      open={Boolean(open)}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 392 },
          maxWidth: '100vw',
          bgcolor: 'rgba(11, 17, 32, 0.98)',
          backgroundImage: 'none',
          borderLeft: '1px solid rgba(148, 163, 184, 0.18)',
        },
      }}
    >
      <Box
        sx={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ p: 2, pb: 1.5 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.24)',
            }}
          >
            <SupportAgentRoundedIcon fontSize="small" />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="h2" variant="subtitle1" fontWeight={900} noWrap>
              Contact suport
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              Trimite rapid o întrebare despre aplicație.
            </Typography>
          </Box>

          <IconButton color="inherit" onClick={onClose} aria-label="Închide contact suport">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.14)' }} />

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            gap: 2,
          }}
        >
          <TextField
            label="Subiect opțional"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setSendError(null);
              setSentResult(null);
            }}
            error={subjectTooLong}
            helperText={`${trimmedSubject.length}/${MAX_SUBJECT_LENGTH}`}
            disabled={isSending}
            fullWidth
            sx={fieldSx}
          />

          <TextField
            label="Mesaj"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setSendError(null);
              setSentResult(null);
            }}
            error={messageTooLong}
            helperText={`${trimmedMessage.length}/${MAX_MESSAGE_LENGTH}`}
            disabled={isSending}
            multiline
            minRows={6}
            fullWidth
            required
            sx={fieldSx}
          />

          <AnimatePresence mode="wait">
            {sentResult ? (
              <MotionBox
                key="support-success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Alert severity="success" variant="outlined">
                  <Typography variant="body2" fontWeight={800}>
                    Mesaj trimis.
                  </Typography>
                  {successDetails.length > 0 ? (
                    <Stack spacing={0.25} sx={{ mt: 0.75 }}>
                      {successDetails.map((detail) => (
                        <Typography
                          key={detail}
                          variant="caption"
                          color="text.secondary"
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {detail}
                        </Typography>
                      ))}
                    </Stack>
                  ) : null}
                </Alert>
              </MotionBox>
            ) : null}

            {sendError ? (
              <MotionBox
                key="support-error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Alert severity="error" variant="outlined">
                  {sendError}
                </Alert>
              </MotionBox>
            ) : null}
          </AnimatePresence>

          <Box sx={{ flex: 1 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              startIcon={<DeleteSweepRoundedIcon />}
              onClick={handleClear}
              disabled={isSending || (!subject && !message && !sendError && !sentResult)}
              fullWidth
            >
              Curăță
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={isSending ? <CircularProgress size={16} color="inherit" /> : <SendRoundedIcon />}
              disabled={!canSend}
              fullWidth
            >
              Trimite
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SupportChatDrawer;
