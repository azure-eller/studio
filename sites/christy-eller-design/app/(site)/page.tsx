import type { Metadata } from 'next'
import Link from 'next/link'
import { ComesWith, Intro, PostList, Shelf } from '@/components/sections'
import { ButtonLink, Container } from '@/components/ui'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Websites for small businesses in Colorado',
  description:
    'Christy Eller designs and builds websites for small businesses and nonprofits in Colorado: real photos, an admin you can update yourself, launched in weeks.',
}

const shelf = [
  '/photos/work-bross-hotel.webp',
  '/photos/work-ela-family-farms.webp',
  '/photos/work-jackson-soil-solutions.webp',
  '/photos/work-montrose-library.webp',
  '/photos/work-fire-mountain-ranch.webp',
  '/photos/work-rubicon-coffee.webp',
]

export default function Page() {
  const b = site.brief
  return (
    <>
      <section aria-labelledby="hero-title" className="pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24">
        <Container>
          <h1
            id="hero-title"
            className="font-heading max-w-[15ch] text-[clamp(2.75rem,7.2vw,6rem)] font-medium leading-[0.98] tracking-[-0.02em]"
          >
            {b.org.tagline}
          </h1>
          <p className="mt-7 max-w-[36rem] text-[clamp(1.125rem,1.6vw,1.375rem)] leading-[1.5] text-muted-foreground">
            I design and build websites for small businesses and nonprofits in Colorado: the kind that don’t have a
            marketing department, just an owner who needs the site to work.
          </p>
          <div className="font-ui mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ButtonLink href="/contact" className="h-12 px-7 text-[1.0625rem] font-bold">
              Start a project
            </ButtonLink>
            <Link
              href="/gallery"
              className="text-[1.0625rem] text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
            >
              See recent work
            </Link>
          </div>
        </Container>
      </section>

      <Shelf title="Recent work" keys={shelf} href="/gallery" linkLabel="All work" />

      <ComesWith
        title="A site from me comes with the things people usually forget."
        body="Every project gets a clear structure, real photography, and copy you can actually update."
        items={[
          'Hours that are correct.',
          'A phone number you can tap.',
          'Real photos of your place, not stock.',
          'An admin you can update yourself, without calling anyone.',
          'Launched in weeks, not months.',
        ]}
      />

      <Intro
        photo={site.photo('/photos/christy-waterfall.jpg')}
        paragraphs={[
          'The clients I like best are the ones with a real thing to show: a soil company, a pickleball club, a mountain-town hotel, a church, a farm stand.',
        ]}
        name="Christy Eller"
        place="Paonia, Colorado"
        href="/about"
        linkLabel="More about Christy"
      />

      <PostList title="Notes" limit={3} hideWhenEmpty linkAll={{ href: '/posts', label: 'All notes' }} />
    </>
  )
}
