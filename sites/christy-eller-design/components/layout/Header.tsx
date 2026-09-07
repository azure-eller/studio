import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui'
import { getNav, getSettings } from '@/lib/core'
import { mediaUrl } from '@/lib/media'
import { site } from '@/lib/site'

/** The name in the serif, the menu in the sans, and the phone number where it can be tapped. All from Settings. */
export async function Header() {
  const [settings, nav] = await Promise.all([getSettings(), getNav()])
  const logo = site.brief.media.logo
  const tel = settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <header className="border-b border-border">
      <Container className="flex items-center justify-between gap-6 py-5">
        <Link href="/" className="flex items-center gap-3 font-heading text-[1.4rem] leading-none tracking-[-0.01em]">
          {logo ? <Image src={mediaUrl(logo.key)} width={logo.width} height={logo.height} alt={logo.alt || `${settings.name} logo`} className="h-8 w-auto" priority /> : null}
          <span>{settings.name}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-[15px] md:flex">
          {nav.map((p) => (
            <Link key={p.path} href={p.path} className="rounded-sm py-1 hover:text-primary hover:underline underline-offset-[6px]">
              {p.label}
            </Link>
          ))}
          {tel && (
            <a href={tel} className="rounded-sm py-1 text-primary underline underline-offset-[6px] decoration-1 hover:decoration-2">
              {settings.phone}
            </a>
          )}
        </nav>
        <details className="group relative md:hidden">
          <summary className="cursor-pointer list-none rounded-[var(--radius)] border border-border px-3 py-2 text-[15px] leading-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <nav aria-label="Main" className="absolute right-0 z-20 mt-2 flex w-60 flex-col rounded-[var(--radius)] border border-border bg-background py-2 shadow-[0_8px_24px_-12px_rgba(35,28,23,0.35)]">
            {nav.map((p) => (
              <Link key={p.path} href={p.path} className="px-4 py-3 text-[17px] hover:bg-muted">
                {p.label}
              </Link>
            ))}
            {tel && (
              <a href={tel} className="border-t border-border px-4 py-3 text-[17px] text-primary">
                {settings.phone}
              </a>
            )}
          </nav>
        </details>
      </Container>
    </header>
  )
}
