'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** The footer's invitation column, left out on the contact page, which is the invitation. */
export function FooterInvite(p: { children: ReactNode }) {
  const path = usePathname()
  if (path === '/contact') return null
  return <>{p.children}</>
}
