import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground',
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 px-6 text-center',
        className
      )}
    >
      <AlertCircle className="h-7 w-7 text-destructive" />
      <p className="max-w-md text-sm text-destructive">
        {message || 'Something went wrong.'}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 px-6 text-center',
        className
      )}
    >
      {Icon && (
        <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

/* ── Skeleton screens ─────────────────────────────────────── */

export function InboxSkeleton({ rows = 10 }) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3" style={{ borderLeft: '3px solid transparent' }}>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3 p-5">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {/* Donut + attention */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 p-6">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="mx-auto h-44 w-44 rounded-full" />
        </Card>
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
