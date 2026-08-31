import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export function Container(p: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-5 sm:px-8 ${p.narrow ? 'max-w-3xl' : 'max-w-6xl'} ${p.className ?? ''}`}>{p.children}</div>
}

/** Every section owns its vertical rhythm (design-system skill). */
export function Section(p: { children: ReactNode; tone?: 'bg' | 'surface' | 'accent'; id?: string; className?: string; labelledBy?: string }) {
  const tone = p.tone ?? 'bg'
  const cls = tone === 'surface' ? 'bg-surface' : tone === 'accent' ? 'bg-accent text-accent-fg' : 'bg-bg'
  return (
    <section id={p.id} aria-labelledby={p.labelledBy} className={`py-[var(--section-y)] ${cls} ${p.className ?? ''}`}>
      {p.children}
    </section>
  )
}

export function Eyebrow(p: { children: ReactNode; className?: string }) {
  return <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted ${p.className ?? ''}`}>{p.children}</p>
}

type HeadingLevel = 1 | 2 | 3
export function Heading(p: { level: HeadingLevel; children: ReactNode; className?: string; id?: string }) {
  const sizes: Record<HeadingLevel, string> = {
    1: 'text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]',
    2: 'text-2xl sm:text-3xl font-bold leading-tight',
    3: 'text-lg font-semibold leading-snug',
  }
  const Tag = `h${p.level}` as 'h1' | 'h2' | 'h3'
  return (
    <Tag id={p.id} className={`font-heading ${sizes[p.level]} ${p.className ?? ''}`}>
      {p.children}
    </Tag>
  )
}

export function Lede(p: { children: ReactNode; className?: string }) {
  return <p className={`mt-4 max-w-[var(--measure)] text-lg leading-relaxed text-muted ${p.className ?? ''}`}>{p.children}</p>
}

type ButtonProps = { variant?: 'primary' | 'secondary' | 'ghost'; className?: string; children: ReactNode }
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2'
const btnVariant = {
  primary: 'bg-accent text-accent-fg',
  secondary: 'border border-line bg-bg text-fg',
  ghost: 'text-fg underline underline-offset-4',
}
export function ButtonLink(p: ButtonProps & { href: string }) {
  const external = /^https?:\/\//.test(p.href)
  const cls = `${btnBase} ${btnVariant[p.variant ?? 'primary']} ${p.className ?? ''}`
  return external ? (
    <a href={p.href} className={cls} rel="noopener" target="_blank">
      {p.children}
    </a>
  ) : (
    <Link href={p.href} className={cls}>
      {p.children}
    </Link>
  )
}
export function Button(p: ButtonProps & ComponentProps<'button'>) {
  const { variant, className, children, ...rest } = p
  return (
    <button {...rest} className={`${btnBase} ${btnVariant[variant ?? 'primary']} disabled:opacity-50 ${className ?? ''}`}>
      {children}
    </button>
  )
}

export function Card(p: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'article' }) {
  const Tag = p.as ?? 'div'
  return <Tag className={`rounded-[var(--radius)] border border-line bg-bg p-6 ${p.className ?? ''}`}>{p.children}</Tag>
}

export function Input(p: ComponentProps<'input'>) {
  return <input {...p} className={`w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2.5 text-fg ${p.className ?? ''}`} />
}
export function Textarea(p: ComponentProps<'textarea'>) {
  return <textarea {...p} className={`min-h-32 w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2.5 text-fg ${p.className ?? ''}`} />
}
export function Label(p: ComponentProps<'label'>) {
  return <label {...p} className={`mb-1.5 block text-sm font-semibold ${p.className ?? ''}`} />
}
