import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Container(p: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn('mx-auto w-full px-5 sm:px-8', p.narrow ? 'max-w-3xl' : 'max-w-6xl', p.className)}>{p.children}</div>
}

/** A section with its own vertical rhythm. Tones: the page, a muted band, or the accent. */
export function Section(p: { children: ReactNode; tone?: 'bg' | 'surface' | 'accent'; id?: string; className?: string; labelledBy?: string }) {
  const tone = { bg: 'bg-background', surface: 'bg-muted', accent: 'bg-primary text-primary-foreground' }[p.tone ?? 'bg']
  return (
    <section id={p.id} aria-labelledby={p.labelledBy} className={cn('py-[var(--section-y)]', tone, p.className)}>
      {p.children}
    </section>
  )
}
