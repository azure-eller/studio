import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn's class merger: `cn('p-2', cond && 'p-4')` → the later padding wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
