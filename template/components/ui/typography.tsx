import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Eyebrow(p: { children: ReactNode; className?: string }) {
  return <p className={cn('mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground', p.className)}>{p.children}</p>
}

const sizes = {
  1: 'text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]',
  2: 'text-2xl sm:text-3xl font-bold leading-tight',
  3: 'text-lg font-semibold leading-snug',
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
  return <p className={cn('mt-4 max-w-[var(--measure)] text-lg leading-relaxed text-muted-foreground', p.className)}>{p.children}</p>
}
