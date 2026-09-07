import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

/** Content whose visibility depends on TIME (a post scheduled for tomorrow, an event ending) must surface
 * without anyone touching the admin: regenerate public pages at least hourly on top of tag revalidation. */
export const revalidate = 3600

/** Public site chrome. Scaffolded pages live beside this file; /admin and /api are outside the group. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
