import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A small line above a heading: a date, a section name. Sentence case, in the UI face; never tracked-out capitals. */
export function Eyebrow(p: { children: ReactNode; className?: string }) {
  return <p className={cn('font-ui mb-3 text-[0.9375rem] text-muted-foreground', p.className)}>{p.children}</p>
}

const sizes = {
  1: 'text-[clamp(2.5rem,5.5vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.015em]',
  2: 'text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.12] tracking-[-0.01em]',
  3: 'text-[1.375rem] font-semibold leading-[1.3]',
}
export function Heading(p: { level: 1 | 2 | 3; children: ReactNode; className?: string; id?: string }) {
  const Tag = `h${p.level}` as 'h1' | 'h2' | 'h3'
  return (
    <Tag id={p.id} className={cn('font-heading', sizes[p.level], p.className)}>
      {p.children}
    </Tag>
  )
}

export function Lede(p: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('mt-5 max-w-[50ch] text-[1.25rem] leading-[1.55] text-muted-foreground', p.className)}>
      {p.children}
    </p>
  )
}
