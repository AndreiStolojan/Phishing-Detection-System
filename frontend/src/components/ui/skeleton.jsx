import { cn } from '@/lib/utils';

function Skeleton({ className, children, ...props }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-md bg-muted/60', className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      {children}
    </div>
  );
}

export { Skeleton };
