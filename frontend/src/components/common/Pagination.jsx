import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* One shared control shape so arrows and page numbers line up exactly. */
const control =
  'flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis-' + p);
      acc.push(p);
      return acc;
    }, []);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5"
    >
      <p className="text-xs text-muted-foreground">
        Page <span className="tabular-nums text-foreground">{page}</span> of{' '}
        <span className="tabular-nums text-foreground">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(
            control,
            'border-border text-muted-foreground',
            page <= 1
              ? 'cursor-not-allowed opacity-40'
              : 'hover:bg-accent hover:text-foreground'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pages.map((p) =>
          typeof p === 'string' ? (
            <span
              key={p}
              aria-hidden="true"
              className="px-1 text-xs text-muted-foreground-subtle"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                control,
                p === page
                  ? 'border-primary/40 bg-primary/12 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={cn(
            control,
            'border-border text-muted-foreground',
            page >= totalPages
              ? 'cursor-not-allowed opacity-40'
              : 'hover:bg-accent hover:text-foreground'
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}
