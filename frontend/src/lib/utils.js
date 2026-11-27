import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, letting later Tailwind classes win over earlier ones
 * (e.g. cn('px-2', isWide && 'px-6') → 'px-6'). Used by shadcn/ui and the
 * registry components (Magic UI, Aceternity, React Bits).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
