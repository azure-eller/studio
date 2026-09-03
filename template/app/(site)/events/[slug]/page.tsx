// Part of the template — do not edit. An event, by slug, with its upcoming dates, add-to-calendar and sign-up.
import { nextOccurrence, occurrences } from '@studio/core'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ContactForm, JsonLd, PageHeader, Photo, Prose } from '@/components/sections'
import { ButtonLink, Container, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { formatEventDate, formatEventRange } from '@/lib/format'
import { site } from '@/lib/site'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await content.list('events', { limit: 200 })).map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const ev = await content.get('events', (await params).slug)
  if (!ev) return {}
  const next = nextOccurrence(ev)
  const when = next ? formatEventRange(next.startsAt, next.endsAt, ev.timezone) : formatEventRange(ev.startsAt, ev.endsAt, ev.timezone)
  return { title: ev.title, description: `${when}${ev.location ? ` · ${ev.location}` : ''}`, alternates: { canonical: `/events/${ev.slug}` } }
}

export default async function EventPage({ params }: Params) {
  const ev = await content.get('events', (await params).slug)
  if (!ev) notFound()
  const cover = ev.cover && ev.cover.width && ev.cover.height ? { key: ev.cover.key, width: ev.cover.width, height: ev.cover.height, alt: ev.cover.alt } : null
  const next = nextOccurrence(ev)
  const upcoming = ev.recurrence ? occurrences([ev], { limit: 6 }) : []
  const when = next ? formatEventRange(next.startsAt, next.endsAt, ev.timezone) : formatEventRange(ev.startsAt, ev.endsAt, ev.timezone)
  const eyebrow = [when, ev.recurrence ? 'Repeats' : null, ev.cost].filter(Boolean).join(' · ')
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={ev.title} body={ev.location ?? undefined} />
      {cover && (
        <Section className="!pb-0">
          <Container narrow>
            <Photo photo={cover} priority sizes="(min-width: 768px) 768px, 100vw" />
          </Container>
        </Section>
      )}
      <Prose doc={ev.description} />
      <Section className="!pt-0">
        <Container narrow>
          {upcoming.length > 1 && (
            <>
              <h2 className="font-heading text-xl font-bold">Upcoming dates</h2>
              <ul className="mt-3 grid gap-1 text-muted-foreground">
                {upcoming.map((o) => (
                  <li key={o.key}>
                    <time dateTime={o.startsAt.toISOString()}>{formatEventDate(o.startsAt, ev.timezone)}</time>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {next && <ButtonLink href={`/events/${ev.slug}/calendar${ev.recurrence ? `?at=${encodeURIComponent(next.startsAt.toISOString())}` : ''}`} variant="outline">Add to calendar</ButtonLink>}
            {ev.url && <ButtonLink href={ev.url}>More about this event</ButtonLink>}
          </div>
        </Container>
      </Section>
      {ev.registration && next && <ContactForm variant="register" title="Sign up" tone="surface" event={{ id: ev.id, title: ev.title, date: formatEventDate(next.startsAt, ev.timezone) }} />}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: ev.title,
          startDate: (next?.startsAt ?? ev.startsAt).toISOString(),
          ...(next?.endsAt ?? ev.endsAt ? { endDate: (next?.endsAt ?? ev.endsAt)!.toISOString() } : {}),
          ...(ev.location ? { location: { '@type': 'Place', name: ev.location } } : {}),
          url: `${site.url}/events/${ev.slug}`,
          organizer: { '@type': 'Organization', name: site.name, url: site.url },
        }}
      />
    </>
  )
}
