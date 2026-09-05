import type { Metadata } from 'next'
import { CTA, FeatureGrid, PageHeader, Prose } from '@/components/sections'
import { site } from '@/lib/site'

export const metadata: Metadata = { title: "About Christy Eller Design", description: "I've been designing for the web since the early 2000s, first at agencies and then on my own. The clients I like best are the ones with a real thing to show:…" }

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="About" title="About Christy Eller Design" body="I design and build websites for small businesses and nonprofits in Colorado — the kind that don't have a marketing department, just an owner who needs the site to work." />
      <Prose title="Our mission">
        <p>I’ve been designing for the web since the early 2000s, first at agencies and then on my own. The clients I like best are the ones with a real thing to show: a soil company, a pickleball club, a mountain-town hotel, a church, a farm stand.</p>
        <p>A site from me comes with the things people usually forget — hours that are correct, a phone number you can tap, photos that are actually of your place, and an admin you can log into without calling anyone.</p>
      </Prose>
      <FeatureGrid title="What matters to us" columns={2} items={[{"title":"Real photos of your place, not stock","body":""},{"title":"An admin you can update yourself","body":""},{"title":"Launched in weeks, not months","body":""}]} />
      <CTA title="Come and see for yourself" cta={{ label: "Start a project", href: site.ctas[0]!.href }} variant="card" />
    </>
  )
}
