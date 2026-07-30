import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, ShieldCheck, Mail, RotateCw, Inbox } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/*
  Shared status screens. These are on-screen far more than usual in this app —
  small dev dataset, backend that is sometimes down — so each one is composed
  like a real screen: framed surface, icon in a soft chip, a heading, exactly
  one line of explanation, and an action where an action exists.
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
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-14 text-center',
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
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center',
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
    <Card className="border-border">
      <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center">
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
      </CardContent>
    </Card>
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

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-[34px] w-32 rounded-md" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Donut + attention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <Skeleton className="mb-5 h-3.5 w-28" />
          <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
