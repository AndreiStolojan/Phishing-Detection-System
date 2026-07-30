import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, ShieldCheck, Mail, RotateCw, Inbox } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/*
  Shared status screens. These are on-screen far more than usual in this app —
  small dev dataset, backend that is sometimes down — so each one is composed
  like a real screen: icon in a soft chip, a heading, exactly one line of
  explanation, and an action where an action exists.

  2026-07-30 — the surrounding card frame was removed. The pages these sit on
  are card-free now, so a bordered panel made the empty/error case the only
  boxed thing on the screen — the state that matters least drawing the most
  attention. The centred composition and the generous vertical padding already
  separate them from the page; they do not need a border to do it.
*/

export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-14 text-center',
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-h3 font-semibold text-foreground">Couldn’t load this</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {message || 'The server didn’t respond. It may be offline — try again in a moment.'}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className
      )}
    >
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="space-y-1.5">
        {title && <h3 className="text-h3 font-semibold text-foreground">{title}</h3>}
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/*
  Shown on full pages (Dashboard, Reports) when no Gmail account is connected.
  Without a connected account there is nothing to display, so these pages return
  this prompt instead of any data, counts, or charts.
*/
export function ConnectGmailState() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <ShieldCheck className="h-6 w-6" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-h3 font-semibold text-foreground">Connect Gmail to get started</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          SecureInbox syncs your inbox, scans every message for phishing signals, and keeps a
          security overlay on top — without you opening Gmail.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/settings">
          <Mail className="h-4 w-4" />
          Connect Gmail
        </Link>
      </Button>
    </div>
  );
}

/* ── Skeleton screens ─────────────────────────────────────── */

export function InboxSkeleton({ rows = 8 }) {
  // Vary the line widths slightly so the skeleton reads like real content.
  const widths = ['w-28', 'w-40', 'w-32', 'w-44', 'w-36', 'w-40', 'w-28', 'w-48'];
  return (
    <div
      role="status"
      aria-label="Loading messages"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className={`h-3 ${widths[i % widths.length]}`} />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  A skeleton is a promise about what is arriving. This one mirrors the four
  blocks of the real dashboard — posture, review queue, trend, domains — and is
  card-free like the page it precedes. The previous version drew four stat cards
  and a donut, neither of which the dashboard has any more, so the layout
  visibly rearranged itself the moment the data landed.
*/
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-[34px] w-32 rounded-md" />
      </div>

      {/* 1 — Posture: gauge beside the conclusion, counts on a hairline */}
      <div className="space-y-6">
        <div className="flex flex-col gap-8 min-[780px]:flex-row min-[780px]:items-center">
          <Skeleton className="h-[216px] w-[216px] shrink-0 rounded-full max-[780px]:h-[180px] max-[780px]:w-[180px]" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-7 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-full max-w-[46ch]" />
            <Skeleton className="h-3.5 w-3/4 max-w-[38ch]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 border-t border-border/70 pt-5 min-[780px]:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* 2 — Needs your review */}
      <div className="space-y-4">
        <Skeleton className="h-3.5 w-36" />
        <div className="space-y-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/70 py-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3 min-w-[8rem]" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-5 w-9 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* 3 — Risk over time */}
      <div className="space-y-4">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>

      {/* 4 — Where the risky mail came from */}
      <div className="space-y-4">
        <Skeleton className="h-3.5 w-52" />
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/70 py-3">
              <Skeleton className="h-3.5 w-1/4 min-w-[7rem]" />
              <Skeleton className="h-3 min-w-0 flex-1" />
              <Skeleton className="h-5 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
