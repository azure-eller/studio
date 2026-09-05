import type { Metadata } from 'next'
import { CTA, FeatureGrid, Hero, PostList } from '@/components/sections'
import { site } from '@/lib/site'

export const metadata: Metadata = { title: "Websites for small businesses that look like they cost…", description: "I design and build websites for small businesses and nonprofits in Colorado — the kind that don't have a marketing department, just an owner who needs the…" }

export default function Page() {
  return (
    <>
      <Hero variant="photo" eyebrow="Christy Eller Design" title="Websites for small businesses that look like they cost more than they did." body="I design and build websites for small businesses and nonprofits in Colorado — the kind that don't have a marketing department, just an owner who needs the site to work." cta={{ label: "Start a project", href: site.ctas[0]!.href }} secondaryCta={{ label: "See recent work", href: site.ctas[1]!.href }} />
      <FeatureGrid title="Why Christy Eller Design" columns={2} items={[{"title":"Real photos of your place, not stock","body":""},{"title":"An admin you can update yourself","body":""},{"title":"Launched in weeks, not months","body":""}]} />
      <PostList title="Latest news" limit={3} tone="surface" />
      <CTA title="Real photos of your place, not stock" body="An admin you can update yourself" cta={{ label: "Start a project", href: site.ctas[0]!.href }} secondaryCta={{ label: "See recent work", href: site.ctas[1]!.href }} />
    </>
  )
}
