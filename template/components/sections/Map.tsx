import { ButtonLink, Container, Section } from '@/components/ui'
import { site } from '@/lib/site'

/** A link card, not an embed: no third-party scripts, no cookie banners. */
export function Map() {
  const addr = site.brief.contact.address
  if (!addr) return null
  const q = encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.region} ${addr.postal}`)
  return (
    <Section>
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius)] border border-line bg-surface p-6 sm:flex-row sm:items-center">
          <p className="text-lg">
            {addr.street}, {addr.city}
          </p>
          <ButtonLink href={`https://www.google.com/maps/search/?api=1&query=${q}`} variant="secondary">
            Open in Maps
          </ButtonLink>
        </div>
      </Container>
    </Section>
  )
}
