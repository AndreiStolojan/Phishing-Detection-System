import { useMemo } from 'react';

import { sanitizeEmailHtml } from '@/utils/sanitizeEmailHtml';

/**
 * Render the email body safely. Prefers sanitized HTML, falls back to plain
 * text. Remote images are kept but scripts/iframes/forms are stripped.
 */
export function EmailBody({ htmlBody, textBody }) {
  const safeHtml = useMemo(() => sanitizeEmailHtml(htmlBody), [htmlBody]);

  if (safeHtml) {
    return (
      <div
        className="email-body max-w-none text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_table]:max-w-full [&_table]:table-fixed [&_td]:break-words [&_div]:max-w-full"
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  if (textBody) {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/90">
        {textBody}
      </pre>
    );
  }

  return <p className="text-sm text-muted-foreground">This message has no readable content.</p>;
}
