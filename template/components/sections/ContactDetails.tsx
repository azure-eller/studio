import { Container, Heading, Section } from '@/components/ui'
import { getSettings } from '@/lib/core'

export async function ContactDetails(p: { title?: string; tone?: 'bg' | 'surface' }) {
  const contact = await getSettings()
  const id = 'contact-details-title'
  const addr = contact.address
  return (
    <Section tone={p.tone ?? 'surface'} labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className="mb-6">
          {p.title ?? 'Find us'}
        </Heading>
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {addr && (
            <div>
              <dt className="text-sm font-semibold text-muted">Address</dt>
              <dd className="mt-1 not-italic">
                <address className="whitespace-pre-line not-italic">{addr}</address>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-semibold text-muted">Email</dt>
            <dd className="mt-1">
              <a className="underline underline-offset-4" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </dd>
          </div>
          {contact.phone && (
            <div>
              <dt className="text-sm font-semibold text-muted">Phone</dt>
              <dd className="mt-1">
                <a className="underline underline-offset-4" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>
                  {contact.phone}
                </a>
              </dd>
            </div>
          )}
          {contact.hours && (
            <div>
              <dt className="text-sm font-semibold text-muted">Hours</dt>
              <dd className="mt-1 whitespace-pre-line">{contact.hours}</dd>
            </div>
          )}
          {contact.socials.length > 0 && (
            <div>
              <dt className="text-sm font-semibold text-muted">Follow</dt>
              <dd className="mt-1 flex flex-wrap gap-3">
                {contact.socials.map((x) => (
                  <a key={x.label} href={x.url} rel="noopener" target="_blank" className="underline underline-offset-4">
                    {x.label}
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </Container>
    </Section>
  )
}
