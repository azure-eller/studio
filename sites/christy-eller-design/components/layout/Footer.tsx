import Link from 'next/link'
import { Container } from '@/components/ui'
import { getNav, getSettings } from '@/lib/core'
import { FooterInvite } from './FooterInvite'

/** The footer is the invitation: the closing line of every page, with the email the owner keeps in Settings. */
export async function Footer() {
  const [s, nav] = await Promise.all([getSettings(), getNav()])
  const phoneHref = s.phone ? `tel:${s.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <footer className="bg-foreground text-background">
      <Container className="grid gap-12 py-16 md:grid-cols-12 md:py-24">
        <FooterInvite>
          <div className="md:col-span-7">
            <p className="font-heading text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[1.02] tracking-[-0.015em]">
              Start a project.
            </p>
            <p className="mt-5 max-w-[34rem] text-[1.125rem] leading-[1.55] text-background/75">
              Tell me what you do and what the site needs to do. Most sites launch within a few weeks.
            </p>
            <p className="font-ui mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[1.0625rem]">
              <a
                href={`mailto:${s.email}`}
                className="underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
              >
                {s.email}
              </a>
              {s.phone && phoneHref && (
                <a href={phoneHref} className="underline decoration-1 underline-offset-[0.3em] hover:decoration-2">
                  {s.phone}
                </a>
              )}
            </p>
          </div>
        </FooterInvite>
        <div className="font-ui grid gap-8 text-[0.9375rem] sm:grid-cols-2 md:col-span-5">
          <nav aria-label="Footer" className="flex flex-col gap-2">
            {nav.map((p) => (
              <Link key={p.path} href={p.path} className="w-fit underline-offset-[0.3em] hover:underline">
                {p.label}
              </Link>
            ))}
            {s.socials.map((x) => (
              <a
                key={x.label}
                href={x.url}
                rel="noopener"
                target="_blank"
                className="w-fit underline-offset-[0.3em] hover:underline"
              >
                {x.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-3 text-background/75">
            <p className="text-background">{s.name}</p>
            {s.tagline && <p>{s.tagline}</p>}
            {s.address && <address className="whitespace-pre-line not-italic">{s.address}</address>}
            {s.hours && <p className="whitespace-pre-line">{s.hours}</p>}
            {!s.address && <p>Paonia, Colorado</p>}
          </div>
        </div>
      </Container>
      <Container className="font-ui flex flex-wrap items-center justify-between gap-3 border-t border-background/15 py-5 text-sm text-background/75">
        <span>
          © {new Date().getFullYear()} {s.name}
        </span>
        <span className="flex gap-5">
          <Link href="/privacy" className="underline-offset-[0.3em] hover:underline">
            Privacy
          </Link>
          <Link href="/admin" className="underline-offset-[0.3em] hover:underline">
            Admin
          </Link>
        </span>
      </Container>
    </footer>
  )
}
