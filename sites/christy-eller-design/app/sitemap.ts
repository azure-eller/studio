import { nextOccurrence } from '@studio/core'
import type { MetadataRoute } from 'next'
import { content } from '@/lib/core'
import { site } from '@/lib/site'

/** Regenerated at most every 10 minutes so posts/events added in the admin reach search engines without a deploy. */
export const revalidate = 600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = site.pages.map((p) => ({ url: `${site.url}${p.path}`, changeFrequency: 'weekly', priority: p.key === 'home' ? 1 : 0.7 }))
  entries.push({ url: `${site.url}/privacy`, changeFrequency: 'yearly', priority: 0.1 })
  const posts = await content.list('posts', { limit: 200 })
  if (posts.length && !site.brief.pages.includes('posts')) entries.push({ url: `${site.url}/posts`, lastModified: posts[0]!.updatedAt })
  for (const p of posts) entries.push({ url: `${site.url}/posts/${p.slug}`, lastModified: p.updatedAt })
  for (const pg of await content.list('pages', { limit: 200 })) entries.push({ url: `${site.url}/${pg.slug}`, lastModified: pg.updatedAt })
  // The upcoming filter keeps every repeating master; drop the ones whose rule has run out.
  const events = (await content.list('events', { filter: 'upcoming', limit: 200 })).filter((e) => nextOccurrence(e))
  if (events.length && !site.brief.pages.includes('events')) entries.push({ url: `${site.url}/events`, lastModified: events[0]!.updatedAt })
  for (const e of events) entries.push({ url: `${site.url}/events/${e.slug}`, lastModified: e.updatedAt })
  return entries
}
