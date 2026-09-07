import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink, Container } from '@/components/ui'
import { getNav, getSettings } from '@/lib/core'
import { mediaUrl } from '@/lib/media'
import { site } from '@/lib/site'

export async function Header() {
  const [settings, nav] = await Promise.all([getSettings(), getNav()])
  const logo = site.brief.media.logo
  const cta = site.primaryCta
  return (
    <header className="border-b border-border bg-background">
      <Container className="flex items-center justify-between gap-6 py-4">
        <Link href="/" className="flex items-center gap-3 font-heading text-lg font-bold">
          {logo ? <Image src={mediaUrl(logo.key)} width={logo.width} height={logo.height} alt={logo.alt || `${settings.name} logo`} className="h-9 w-auto" priority /> : null}
          <span>{settings.name}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {nav.map((p) => (
            <Link key={p.path} href={p.path} className="text-sm font-semibold hover:underline underline-offset-4">
              {p.label}
            </Link>
          ))}
          {cta && <ButtonLink href={cta.href} size="default">{cta.label}</ButtonLink>}
        </nav>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-border px-3 py-2 text-sm font-semibold">Menu</summary>
          <nav aria-label="Main" className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-1 rounded-lg border border-border bg-background p-2 shadow-lg">
            {nav.map((p) => (
              <Link key={p.path} href={p.path} className="rounded px-3 py-2 text-sm font-semibold hover:bg-muted">
                {p.label}
              </Link>
            ))}
          </nav>
        </details>
      </Container>
    </header>
  )
}
