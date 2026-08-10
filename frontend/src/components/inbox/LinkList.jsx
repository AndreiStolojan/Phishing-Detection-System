// ─────────────────────────────────────────────────────────────────────────────
// LinkList.jsx — the URLs found in a message, shown safely.
//
// Three rules this component exists to enforce:
//   1. Nothing here is clickable. A phishing URL is evidence to be read, never
//      a destination to be visited.
//   2. A long URL must not widen the pane. It is cut at MAX_URL characters with
//      a trailing "…" and additionally clipped by CSS, so the row can never
//      push the layout sideways no matter how absurd the URL is.
//   3. The user still needs the full string — to paste into a scanner, a ticket
//      or an email to IT — so every row has a copy button that puts the whole,
//      untruncated URL on the clipboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

// Long enough to show the host plus a meaningful slice of the path, short
// enough that a row still fits the narrow end of the detail pane.
const MAX_URL = 68;

export const truncateUrl = (url, max = MAX_URL) =>
  url.length > max ? `${url.slice(0, max)}…` : url;

// The API returns links either as plain strings or as objects.
const toUrl = (link) =>
  typeof link === 'string' ? link : link?.url || link?.href || '';

export function LinkList({ links }) {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (url, key) => {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard blocked (permissions, insecure origin). The full URL is still
      // in the row's tooltip, so the user is not stuck — stay quiet.
    }
  };

  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground">This message has no links.</p>;
  }

  return (
    <ul className="grid gap-px">
      {links.map((link, i) => {
        const url = toUrl(link);
        const isCopied = copied === i;

        return (
          <li key={`${url}-${i}`} className="flex min-w-0 items-center gap-2.5 py-1.5">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground-subtle" aria-hidden="true" />
            <span
              title={url}
              className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80"
            >
              {truncateUrl(url)}
            </span>
            <button
              type="button"
              onClick={() => copy(url, i)}
              aria-label={`Copy link ${url}`}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
