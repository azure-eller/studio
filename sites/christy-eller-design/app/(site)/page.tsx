import type { Metadata } from 'next'
import Link from 'next/link'
import { PostList } from '@/components/sections'
import { Window } from '@/components/sections/Window'
import { ButtonLink, Container, Heading, Section } from '@/components/ui'
import { content, getSettings } from '@/lib/core'
import { site } from '@/lib/site'
import { work } from '@/lib/work'

export const metadata: Metadata = {
  title: 'Websites for small businesses in Colorado',
  description: 'Christy Eller designs and builds websites for small businesses and nonprofits in Colorado: real photos of your place, an admin you can update yourself, launched in weeks.',
}

const promises = [
  { title: 'Real photos of your place, not stock', body: 'Photos that are actually of your building, your people and what you sell. Hours that are correct. A phone number you can tap.' },
  { title: 'An admin you can update yourself', body: 'Copy you can change, notes you can post and photos you can swap, from an admin you log into without calling anyone.' },
  { title: 'Launched in weeks, not months', body: 'A clear structure agreed up front, then the build. Most sites launch within a few weeks.' },
]

export default async function Page() {
  const [posts, settings] = await Promise.all([content.list('posts', { limit: 3 }), getSettings()])
  const lead = work[0]!
  const more = work.slice(1, 7)
  const tel = settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <>
      <Section labelledBy="hero-title" className="!pt-14 !pb-0 sm:!pt-20">
        <Container>
          <Heading level={1} id="hero-title" className="max-w-[19ch]">
            {site.tagline}
          </Heading>
          <p className="mt-7 max-w-[54ch] font-heading text-[1.3rem] leading-[1.5] text-muted-foreground">
            I design and build websites for small businesses and nonprofits in Colorado. The kind that don’t have a marketing department, just an owner who needs the site to work.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ButtonLink href="/contact" className="h-11 px-6 text-[15px]">
              Start a project
            </ButtonLink>
            <Link href="/gallery" className="link text-[15px]">
              See the work
            </Link>
          </div>
          <div className="mt-16 sm:mt-20">
            <Window photo={site.photo(lead.key)} domain={lead.domain} client={lead.client} town={lead.town} note={lead.note} priority sizes="(min-width: 1152px) 1104px, 100vw" />
          </div>
        </Container>
      </Section>

      <Section labelledBy="promises-title">
        <Container>
          <Heading level={2} id="promises-title" className="max-w-[24ch]">
            A site from me comes with the things people usually forget.
          </Heading>
          <dl className="mt-10 divide-y divide-border border-y border-border">
            {promises.map((x) => (
              <div key={x.title} className="grid gap-2 py-7 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
                <dt className="font-heading text-[1.5rem] leading-tight">{x.title}</dt>
                <dd className="max-w-[52ch] font-heading text-[1.15rem] leading-relaxed text-muted-foreground">{x.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section labelledBy="work-title" className="!pt-0">
        <Container>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Heading level={2} id="work-title">
              Recent work
            </Heading>
            <Link href="/gallery" className="link text-[15px]">
              All the work
            </Link>
          </div>
          <ul className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-2">
            {more.map((w) => (
              <li key={w.key}>
                <Window photo={site.photo(w.key)} domain={w.domain} client={w.client} town={w.town} note={w.note} sizes="(min-width: 1152px) 552px, (min-width: 768px) 50vw, 100vw" />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {posts.length > 0 && <PostList title="Notes" limit={3} />}

      <Section tone="surface" labelledBy="start-title">
        <Container>
          <Heading level={2} id="start-title" className="max-w-[20ch]">
            Have a real thing to show?
          </Heading>
          <p className="mt-5 max-w-[50ch] font-heading text-[1.2rem] leading-relaxed text-muted-foreground">
            Tell me what you do and what the site needs to do. A soil company, a pickleball club, a mountain-town hotel, a church, a farm stand: those are the projects I like best.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 text-[15px]">
            <ButtonLink href="/contact" className="h-11 px-6 text-[15px]">
              Start a project
            </ButtonLink>
            <a href={`mailto:${settings.email}`} className="link">
              {settings.email}
            </a>
            {tel && (
              <a href={tel} className="link">
                {settings.phone}
              </a>
            )}
          </div>
        </Container>
      </Section>
    </>
  )
}
