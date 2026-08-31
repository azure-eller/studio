import Link from 'next/link'
import { Container } from '@/components/ui'
import { site } from '@/lib/site'

export function Footer() {
  const { contact, socials } = site.brief
  const addr = contact.address
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="font-heading text-lg font-bold">{site.name}</p>
          <p className="mt-2 max-w-sm text-muted">{site.tagline}</p>
        </div>
        <div className="text-sm">
          {addr && (
            <address className="not-italic text-muted">
              {addr.street}
              <br />
              {addr.city}, {addr.region} {addr.postal}
            </address>
          )}
          <p className="mt-2">
            <a href={`mailto:${contact.email}`} className="underline underline-offset-4">
              {contact.email}
            </a>
          </p>
          {contact.phone && <p className="mt-1">{contact.phone}</p>}
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          {site.nav.map((p) => (
            <Link key={p.path} href={p.path} className="hover:underline underline-offset-4">
              {p.label}
            </Link>
          ))}
          {socials &&
            Object.entries(socials).map(([k, url]) => (
              <a key={k} href={url} rel="noopener" target="_blank" className="capitalize hover:underline underline-offset-4">
                {k}
              </a>
            ))}
        </nav>
      </Container>
      <Container className="border-t border-line py-4 text-xs text-muted">
        © {new Date().getFullYear()} {site.name}
      </Container>
    </footer>
  )
}
