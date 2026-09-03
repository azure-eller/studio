import Link from 'next/link'
import type { ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** A link styled as a button (shadcn's variants); external URLs open in a new tab. */
export function ButtonLink(p: { href: string; children: ReactNode; className?: string } & VariantProps<typeof buttonVariants>) {
  const cls = cn(buttonVariants({ variant: p.variant, size: p.size ?? 'lg' }), p.className)
  return /^https?:\/\//.test(p.href) ? (
    <a href={p.href} className={cls} rel="noopener" target="_blank">
      {p.children}
    </a>
  ) : (
    <Link href={p.href} className={cls}>
      {p.children}
    </Link>
  )
}
