import Link from 'next/link'
import { Card, Container, Heading, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { formatEventDate } from '@/lib/format'
import { site } from '@/lib/site'
import { JsonLd } from './JsonLd'

export async function EventList(p: { title?: string; limit?: number; emptyText?: string; tone?: 'bg' | 'surface' }) {
  const events = await content.list('events', { filter: 'upcoming', limit: p.limit ?? 12 })
  const id = 'events-title'
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className="mb-8">
          {p.title ?? 'Upcoming events'}
        </Heading>
        {events.length === 0 ? (
          <p className="text-muted">{p.emptyText ?? 'Nothing scheduled right now. Check back soon.'}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Card key={e.id} as="li">
                <p className="text-sm font-semibold text-muted">
                  <time dateTime={e.startsAt.toISOString()}>{formatEventDate(e.startsAt, e.timezone)}</time>
                </p>
                <Heading level={3} className="mt-2">
                  <Link href={`/events/${e.slug}`} className="hover:underline">
                    {e.title}
                  </Link>
                </Heading>
                {e.location && <p className="mt-1 text-muted">{e.location}</p>}
              </Card>
            ))}
          </ul>
        )}
        <JsonLd
          data={events.map((e) => ({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: e.title,
            startDate: e.startsAt.toISOString(),
            ...(e.endsAt ? { endDate: e.endsAt.toISOString() } : {}),
            ...(e.location ? { location: { '@type': 'Place', name: e.location } } : {}),
            url: `${site.url}/events/${e.slug}`,
            organizer: { '@type': 'Organization', name: site.name, url: site.url },
          }))}
        />
      </Container>
    </Section>
  )
}
