import type { Metadata } from 'next'
import { Photo } from '@/components/sections'
import { Container, Heading } from '@/components/ui'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About Christy Eller',
  description:
    'Christy Eller has designed for the web since the early 2000s, first at agencies and then on her own, from Paonia on Colorado’s western slope.',
}

const facts: [string, string][] = [
  ['Based in', 'Paonia, Colorado, on the western slope'],
  [
    'In technology since',
    '1999, with an internet service that started in the dial-up days and grew into a broadband wireless network',
  ],
]

export default function Page() {
  const about = (site.brief.org.about ?? '').split(/\n\s*\n/)
  return (
    <>
      <section aria-labelledby="page-title" className="pt-14 pb-[var(--section-y)] sm:pt-20">
        <Container className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <Photo
              photo={site.photo('/photos/christy-sunflowers.jpg')}
              priority
              sizes="(min-width: 768px) 440px, 100vw"
              className="border border-border"
            />
          </div>
          <div className="md:col-span-7 md:pt-2">
            <Heading level={1} id="page-title">
              About Christy
            </Heading>
            <p className="mt-5 max-w-[50ch] text-[1.25rem] leading-[1.55] text-muted-foreground">
              Websites for small businesses and nonprofits in Colorado, made by one person who has been doing this a
              long time.
            </p>
            <dl className="font-ui mt-8 grid max-w-[36rem] gap-3 text-[0.9375rem]">
              {facts.map(([k, v]) => (
                <div key={k} className="grid gap-x-4 border-t border-border pt-3 sm:grid-cols-[11rem_1fr]">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-heading text-[1.0625rem]">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-10 max-w-[var(--measure)] space-y-5 text-[1.125rem] leading-[1.65]">
              {about.map((t) => (
                <p key={t.slice(0, 24)}>{t}</p>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="where-title" className="bg-muted py-[var(--section-y)]">
        <Container>
          <Heading level={2} id="where-title" className="!text-[1.375rem] !font-semibold">
            Serving
          </Heading>
          <p className="font-heading mt-5 max-w-[30ch] text-[clamp(1.5rem,3.2vw,2.75rem)] leading-[1.25] tracking-[-0.01em]">
            Paonia, Hotchkiss, Delta, Cedaredge, Olathe, Montrose, Grand Junction, Carbondale, Aspen, Glenwood Springs,
            Basalt, Rifle, Silt, Fruita, Clifton, Parachute… and absolutely everywhere.
          </p>
        </Container>
      </section>
    </>
  )
}
