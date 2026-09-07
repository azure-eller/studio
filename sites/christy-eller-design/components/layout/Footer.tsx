import Link from 'next/link'
import { Container } from '@/components/ui'
import { getNav, getSettings } from '@/lib/core'

/** Name and tagline, the ways to reach her, the menu. Everything here is editable in the admin under Settings. */
export async function Footer() {
  const [s, nav] = await Promise.all([getSettings(), getNav()])
  const tel = s.phone ? `tel:${s.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <footer className="mt-auto border-t border-border">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-heading text-[1.4rem] leading-none">{s.name}</p>
          {s.tagline && <p className="mt-3 max-w-[28ch] font-heading text-[1.15rem] leading-snug text-muted-foreground">{s.tagline}</p>}
        </div>
        <div className="text-[15px] leading-relaxed">
          <p>
            <a href={`mailto:${s.email}`} className="link">
              {s.email}
            </a>
          </p>
          {tel && (
            <p className="mt-1">
              <a href={tel} className="link">
                {s.phone}
              </a>
            </p>
          )}
          {s.address && <address className="mt-3 whitespace-pre-line not-italic text-muted-foreground">{s.address}</address>}
          {s.hours && <p className="mt-3 whitespace-pre-line text-muted-foreground">{s.hours}</p>}
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-[15px]">
          {nav.map((p) => (
            <Link key={p.path} href={p.path} className="w-fit hover:text-primary hover:underline underline-offset-4">
              {p.label}
            </Link>
          ))}
          {s.socials.map((x) => (
            <a key={x.label} href={x.url} rel="noopener" target="_blank" className="w-fit hover:text-primary hover:underline underline-offset-4">
              {x.label}
            </a>
          ))}
        </nav>
      </Container>
      <Container className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-[13px] text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {s.name}
        </span>
        <Link href="/privacy" className="hover:text-primary hover:underline underline-offset-4">
          Privacy
        </Link>
      </Container>
    </footer>
  )
}
