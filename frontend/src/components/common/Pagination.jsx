import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors',
            page <= 1
              ? 'cursor-not-allowed opacity-40'
              : 'hover:bg-accent hover:text-accent-foreground'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) {
              acc.push('ellipsis-' + p);
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                  p === page
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors',
            page >= totalPages
              ? 'cursor-not-allowed opacity-40'
              : 'hover:bg-accent hover:text-accent-foreground'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
