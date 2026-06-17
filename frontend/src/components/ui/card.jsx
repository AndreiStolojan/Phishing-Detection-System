import { cn } from '@/lib/utils';

function Card({ className, interactive = false, style, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground surface-raised',
        interactive &&
          'transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-white/10',
        className
      )}
      style={{ borderColor: '#1e2a45', ...style }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b p-5', className)}
      style={{ borderColor: '#2a3755' }}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h2
      className={cn('text-base font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
