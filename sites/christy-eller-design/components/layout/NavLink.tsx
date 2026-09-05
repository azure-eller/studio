'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A menu link that underlines itself on its own section. */
export function NavLink(p: { href: string; children: ReactNode; className?: string }) {
  const path = usePathname()
  const current = p.href === '/' ? path === '/' : path === p.href || path.startsWith(`${p.href}/`)
  return (
    <Link
      href={p.href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'underline-offset-[0.3em] decoration-1 hover:underline',
        current && 'underline decoration-primary decoration-2',
        p.className,
      )}
    >
      {p.children}
    </Link>
  )
}
