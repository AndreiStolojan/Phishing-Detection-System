import { Box, Typography } from '@mui/material';

import { sanitizeEmailHtml } from '../../utils/sanitizeEmailHtml.js';

export default function EmailBody({ rawEmail }) {
  const sanitizedHtml = sanitizeEmailHtml(rawEmail?.htmlBody);
  const textBody = rawEmail?.textBody?.trim();

  if (sanitizedHtml) {
    return (
      <Box
        className="secureinbox-email-html"
        sx={{ p: 2 }}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  if (textBody) {
    return (
      <Typography
        component="pre"
        sx={{
          p: 2,
          m: 0,
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'text.primary',
        }}
      >
        {textBody}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
      No readable body was stored for this email.
    </Typography>
  );
}
