import { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';

import { sanitizeEmailHtml } from '@/utils/sanitizeEmailHtml';

const RISKY = new Set(['needs_review', 'quarantine', 'confirmed_phishing']);

/**
 * Render the email body safely. Prefers sanitized HTML, falls back to plain text.
 * For risky messages, remote images are blocked by default (tracking-pixel
 * protection) with a one-click "Load images" affordance; safe messages load them.
 */
export function EmailBody({ htmlBody, textBody, riskBucket }) {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const blockImages = RISKY.has(riskBucket) && !imagesLoaded;

  const { html, blockedImages } = useMemo(
    () => sanitizeEmailHtml(htmlBody, { blockImages }),
    [htmlBody, blockImages]
  );

  if (html) {
    return (
      <div className="space-y-3">
        {blockImages && blockedImages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ImageOff className="h-3.5 w-3.5 shrink-0" />
              {blockedImages} remote image{blockedImages > 1 ? 's' : ''} blocked for your safety
            </span>
            <button
              onClick={() => setImagesLoaded(true)}
              className="font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Load images
            </button>
          </div>
        )}
        <div className="email-body" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
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
