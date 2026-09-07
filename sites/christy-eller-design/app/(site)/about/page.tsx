import type { Metadata } from 'next'
import { Photo } from '@/components/sections'
import { ButtonLink, Container, Heading, Section } from '@/components/ui'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About Christy Eller',
  description: 'Designing for the web since the early 2000s, first at agencies and then on her own, for a soil company, a hotel, libraries, farms and festivals across Colorado.',
}

/** The kinds of client on her portfolio, and the towns her site says she serves. Both are facts from iamchristyeller.com. */
const kinds = ['Small businesses', 'Nonprofits and foundations', 'Schools and community organizations', 'Libraries', 'Farms, wineries and ranches', 'Festivals', 'Health and wellness practices', 'Online stores', 'Community radio stations', 'Authors and artists']
const towns = 'Paonia, Hotchkiss, Delta, Cedaredge, Olathe, Montrose, Grand Junction, Carbondale, Aspen, Glenwood Springs, Basalt, Rifle, Silt, Fruita, Clifton and Parachute'

export default function Page() {
  return (
    <>
      <Section labelledBy="page-title" className="!pt-12 sm:!pt-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-16">
            <div>
              <Heading level={1} id="page-title" className="max-w-[16ch]">
                I’ve been designing for the web since the early 2000s.
              </Heading>
              <div className="prose mt-8">
                <p>First at agencies, and then on my own. The clients I like best are the ones with a real thing to show: a soil company, a pickleball club, a mountain-town hotel, a church, a farm stand.</p>
                <p>A site from me comes with the things people usually forget. Hours that are correct, a phone number you can tap, photos that are actually of your place, and an admin you can log into without calling anyone.</p>
                <p>Every project gets a clear structure, real photography, and copy the owner can actually update. Most sites launch within a few weeks.</p>
              </div>
            </div>
            <div className="md:pt-3">
              <Photo photo={site.photo('/photos/christy.jpg')} priority sizes="(min-width: 768px) 40vw, 100vw" />
              <p className="mt-3 text-[14px] text-muted-foreground">Christy, in Paonia.</p>
            </div>
          </div>
        </Container>
      </Section>

      <Section labelledBy="kinds-title" className="!pt-0">
        <Container>
          <div className="grid gap-8 border-t border-border pt-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
            <Heading level={2} id="kinds-title">
              Who I’ve built for
            </Heading>
            <ul className="columns-2 gap-8 font-heading text-[1.2rem] leading-[1.5]">
              {kinds.map((k) => (
                <li key={k} className="break-inside-avoid">
                  {k}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section labelledBy="where-title" className="!pt-0">
        <Container>
          <div className="grid gap-8 border-t border-border pt-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
            <Heading level={2} id="where-title">
              Where
            </Heading>
            <div>
              <div className="prose">
                <p>Paonia, on the Western Slope of Colorado. Owners in {towns} are the ones I usually work with, though a site can be built for anyone, anywhere.</p>
              </div>
              <ButtonLink href="/contact" className="mt-2 h-11 px-6 text-[15px]">
                Start a project
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
