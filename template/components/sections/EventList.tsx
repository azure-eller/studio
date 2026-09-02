import { occurrences } from '@studio/core'
import Link from 'next/link'
import { Card, Container, Heading, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { formatEventDate } from '@/lib/format'
import { site } from '@/lib/site'
import { JsonLd } from './JsonLd'

/** Upcoming dates, soonest first. A repeating event appears once per date. */
export async function EventList(p: { title?: string; limit?: number; emptyText?: string; tone?: 'bg' | 'surface' }) {
  const events = await content.list('events', { filter: 'upcoming', limit: 100 })
  const next = occurrences(events, { limit: p.limit ?? 12 })
  const id = 'events-title'
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className="mb-8">
          {p.title ?? 'Upcoming events'}
        </Heading>
        {next.length === 0 ? (
          <p className="text-muted">{p.emptyText ?? 'Nothing scheduled right now. Check back soon.'}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {next.map((o) => (
              <Card key={o.key} as="li">
                <p className="text-sm font-semibold text-muted">
                  <time dateTime={o.startsAt.toISOString()}>{formatEventDate(o.startsAt, o.event.timezone)}</time>
                  {o.event.recurrence && <span className="font-normal"> · repeats</span>}
                </p>
                <Heading level={3} className="mt-2">
                  <Link href={`/events/${o.event.slug}`} className="hover:underline">
                    {o.event.title}
                  </Link>
                </Heading>
                {o.event.location && <p className="mt-1 text-muted">{o.event.location}</p>}
                {o.event.cost && <p className="mt-1 text-sm text-muted">{o.event.cost}</p>}
              </Card>
            ))}
          </ul>
        )}
        <JsonLd
          data={next.slice(0, 10).map((o) => ({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: o.event.title,
            startDate: o.startsAt.toISOString(),
            ...(o.endsAt ? { endDate: o.endsAt.toISOString() } : {}),
            ...(o.event.location ? { location: { '@type': 'Place', name: o.event.location } } : {}),
            url: `${site.url}/events/${o.event.slug}`,
            organizer: { '@type': 'Organization', name: site.name, url: site.url },
          }))}
        />
      </Container>
    </Section>
  )
}
