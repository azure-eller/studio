import { content } from '@studio/core'
import type { MetadataRoute } from 'next'
import { getDb } from '@/lib/db'
import { site } from '@/lib/site'

/** Regenerated at most every 10 minutes so posts/events added in the admin reach search engines without a deploy. */
export const revalidate = 600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = site.pages.map((p) => ({ url: `${site.url}${p.path}`, changeFrequency: 'weekly', priority: p.key === 'home' ? 1 : 0.7 }))
  entries.push({ url: `${site.url}/privacy`, changeFrequency: 'yearly', priority: 0.1 })
  if (site.features.posts) for (const p of await content.getPosts(getDb(), { limit: 200 })) entries.push({ url: `${site.url}/posts/${p.slug}`, lastModified: p.updatedAt })
  if (site.features.events) for (const e of await content.getEvents(getDb(), { upcoming: true, limit: 200 })) entries.push({ url: `${site.url}/events/${e.slug}`, lastModified: e.updatedAt })
  return entries
}
