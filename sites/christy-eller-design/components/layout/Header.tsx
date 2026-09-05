import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink, Container } from '@/components/ui'
import { getNav, getSettings } from '@/lib/core'
import { mediaUrl } from '@/lib/media'
import { site } from '@/lib/site'
import { NavLink } from './NavLink'

export async function Header() {
  const [settings, nav] = await Promise.all([getSettings(), getNav()])
  const logo = site.brief.media.logo
  const cta = site.primaryCta
  return (
    <header className="border-b border-border">
      <Container className="flex items-center justify-between gap-6 py-5 sm:py-6">
        <Link
          href="/"
          className="flex items-center gap-3 font-heading text-[1.375rem] font-medium leading-none tracking-[-0.01em]"
        >
          {logo ? (
            <Image
              src={mediaUrl(logo.key)}
              width={logo.width}
              height={logo.height}
              alt={logo.alt || `${settings.name} logo`}
              className="h-9 w-auto"
              priority
            />
          ) : null}
          <span>{settings.name}</span>
        </Link>
        <nav aria-label="Main" className="font-ui hidden items-center gap-7 text-[0.9375rem] md:flex">
          {nav.map((p) => (
            <NavLink key={p.path} href={p.path}>
              {p.label}
            </NavLink>
          ))}
          {cta && (
            <ButtonLink href={cta.href} size="default" className="ml-2">
              {cta.label}
            </ButtonLink>
          )}
        </nav>
        <details className="font-ui relative md:hidden">
          <summary className="cursor-pointer list-none rounded-[var(--radius)] border border-border px-3 py-2 text-[0.9375rem] font-bold [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav
            aria-label="Main"
            className="absolute right-0 z-20 mt-2 flex w-60 flex-col gap-1 rounded-[var(--radius)] border border-border bg-muted p-2"
          >
            {nav.map((p) => (
              <NavLink
                key={p.path}
                href={p.path}
                className="rounded-[var(--radius)] px-3 py-2 text-base hover:bg-background hover:no-underline"
              >
                {p.label}
              </NavLink>
            ))}
            {cta && (
              <ButtonLink href={cta.href} size="default" className="mt-1">
                {cta.label}
              </ButtonLink>
            )}
          </nav>
        </details>
      </Container>
    </header>
  )
}
