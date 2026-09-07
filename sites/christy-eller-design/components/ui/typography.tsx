import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A small sans label. Kept for the admin and for the rare place a label carries information. */
export function Eyebrow(p: { children: ReactNode; className?: string }) {
  return <p className={cn('mb-3 font-body text-sm text-muted-foreground', p.className)}>{p.children}</p>
}

const sizes = {
  1: 'text-[2.5rem] sm:text-[3.25rem] lg:text-[4.25rem] leading-[1.02] tracking-[-0.02em]',
  2: 'text-[1.9rem] sm:text-[2.35rem] leading-[1.12]',
  3: 'text-[1.35rem] leading-snug',
}
export function Heading(p: { level: 1 | 2 | 3; children: ReactNode; className?: string; id?: string }) {
  const Tag = `h${p.level}` as 'h1' | 'h2' | 'h3'
  return (
    <Tag id={p.id} className={cn('font-heading font-normal', sizes[p.level], p.className)}>
      {p.children}
    </Tag>
  )
}

export function Lede(p: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-5 max-w-[var(--measure)] font-heading text-[1.3rem] leading-[1.5] text-muted-foreground', p.className)}>{p.children}</p>
}
