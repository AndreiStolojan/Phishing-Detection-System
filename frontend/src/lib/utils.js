import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names, resolving conflicts (later wins).
 * Used by every shadcn-style component.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
