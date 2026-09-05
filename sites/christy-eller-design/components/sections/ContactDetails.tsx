import { Container, Heading, Section } from '@/components/ui'
import { getSettings } from '@/lib/core'

/** Email, phone, address, hours and socials from Settings. `bare` renders just the list, for a page that lays it out itself. */
export async function ContactDetails(p: { title?: string; tone?: 'bg' | 'surface'; bare?: boolean }) {
  const contact = await getSettings()
  const id = 'contact-details-title'
  const addr = contact.address
  const list = (
    <dl className="font-ui grid gap-6 text-[1.0625rem]">
      <div>
        <dt className="text-[0.9375rem] text-muted-foreground">Email</dt>
        <dd className="mt-1">
          <a
            className="text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
            href={`mailto:${contact.email}`}
          >
            {contact.email}
          </a>
        </dd>
      </div>
      {contact.phone && (
        <div>
          <dt className="text-[0.9375rem] text-muted-foreground">Phone</dt>
          <dd className="mt-1">
            <a
              className="text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
              href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}
            >
              {contact.phone}
            </a>
          </dd>
        </div>
      )}
      {addr && (
        <div>
          <dt className="text-[0.9375rem] text-muted-foreground">Address</dt>
          <dd className="mt-1">
            <address className="whitespace-pre-line not-italic">{addr}</address>
          </dd>
        </div>
      )}
      {contact.hours && (
        <div>
          <dt className="text-[0.9375rem] text-muted-foreground">Hours</dt>
          <dd className="mt-1 whitespace-pre-line">{contact.hours}</dd>
        </div>
      )}
      {contact.socials.length > 0 && (
        <div>
          <dt className="text-[0.9375rem] text-muted-foreground">Elsewhere</dt>
          <dd className="mt-1 flex flex-wrap gap-4">
            {contact.socials.map((x) => (
              <a
                key={x.label}
                href={x.url}
                rel="noopener"
                target="_blank"
                className="text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
              >
                {x.label}
              </a>
            ))}
          </dd>
        </div>
      )}
    </dl>
  )
  if (p.bare) return list
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className="mb-6">
          {p.title ?? 'Get in touch'}
        </Heading>
        {list}
      </Container>
    </Section>
  )
}
