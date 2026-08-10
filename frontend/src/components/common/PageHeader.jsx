import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, eyebrow, titleClassName, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="label-overline">{eyebrow}</p>}
        <h1
          className={cn(
            'text-h2 font-semibold tracking-tight text-foreground',
            titleClassName
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
