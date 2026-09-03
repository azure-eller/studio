import Link from 'next/link'
import { Container } from '@/components/ui'
import { getNav, getSettings } from '@/lib/core'

export async function Footer() {
  const [s, nav] = await Promise.all([getSettings(), getNav()])
  return (
    <footer className="border-t border-border bg-muted">
      <Container className="grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="font-heading text-lg font-bold">{s.name}</p>
          {s.tagline && <p className="mt-2 max-w-sm text-muted-foreground">{s.tagline}</p>}
        </div>
        <div className="text-sm">
          {s.address && <address className="whitespace-pre-line not-italic text-muted-foreground">{s.address}</address>}
          <p className="mt-2">
            <a href={`mailto:${s.email}`} className="underline underline-offset-4">
              {s.email}
            </a>
          </p>
          {s.phone && <p className="mt-1">{s.phone}</p>}
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          {nav.map((p) => (
            <Link key={p.path} href={p.path} className="hover:underline underline-offset-4">
              {p.label}
            </Link>
          ))}
          {s.socials.map((x) => (
            <a key={x.label} href={x.url} rel="noopener" target="_blank" className="hover:underline underline-offset-4">
              {x.label}
            </a>
          ))}
        </nav>
      </Container>
      <Container className="flex items-center justify-between border-t border-border py-4 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} {s.name}</span>
        <Link href="/privacy" className="hover:underline underline-offset-4">
          Privacy
        </Link>
      </Container>
    </footer>
  )
}
