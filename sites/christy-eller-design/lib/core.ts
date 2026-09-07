// The one site object: API, admin metadata and typed content reads (SPEC §1). Everything else imports from here.
import { createSite, env, occurrences, type Collections, type defaultCollections } from '@studio/core'
import { nextCache } from '@studio/core/next'
import { collections } from './collections'
import { getDb } from './db'
import { site } from './site'

// Sections are written once for every site, so reads are typed over the full default set. A collection the brief
// turned off throws "Unknown collection" at runtime; the scaffold never emits a section for a disabled feature.
type AllCollections = ReturnType<typeof defaultCollections>
export const core = createSite({ db: getDb(), env, collections: collections as Collections<AllCollections>, cache: nextCache(), deps: { siteName: site.name } })
export const content = core.content

export interface SiteSettings {
  name: string
  tagline: string
  email: string
  phone: string | null
  /** Multi-line, as the owner typed it. */
  address: string | null
  hours: string | null
  socials: { label: string; url: string }[]
}

/**
 * What the header, footer and contact page show. The owner edits it in the admin (seeded from the brief), and it
 * changes on the live site without a redeploy. Falls back to the brief until the settings row exists.
 */
export async function getSettings(): Promise<SiteSettings> {
  const s = await content.get('settings')
  const b = site.brief
  const addr = b.contact.address
  const briefAddress = addr ? `${addr.street}\n${addr.city}, ${addr.region} ${addr.postal}` : null
  const socials = s
    ? [
        ['Facebook', s.facebook],
        ['Instagram', s.instagram],
        ['YouTube', s.youtube],
      ]
    : Object.entries(b.socials ?? {}).map(([k, url]) => [k.charAt(0).toUpperCase() + k.slice(1), url])
  return {
    name: s?.name ?? site.name,
    tagline: s?.tagline ?? site.tagline,
    email: s?.email ?? b.contact.email,
    phone: (s ? s.phone : b.contact.phone) ?? null,
    address: (s ? s.address : briefAddress) ?? null,
    hours: (s ? s.hours : b.contact.hours) ?? null,
    socials: socials.filter((x): x is [string, string] => typeof x[1] === 'string' && x[1].length > 0).map(([label, url]) => ({ label, url })),
  }
}

/**
 * The menu: the brief's pages; News and Events too once the owner has published any (they exist on every site);
 * then any admin-made page marked "Show in the menu".
 */
export async function getNav(): Promise<{ path: string; label: string }[]> {
  const [pages, posts, events] = await Promise.all([
    content.list('pages', { where: { showInNav: true }, limit: 20 }),
    site.brief.pages.includes('posts') ? [] : content.list('posts', { limit: 1 }),
    site.brief.pages.includes('events') ? [] : content.list('events', { filter: 'upcoming', limit: 200 }),
  ])
  const extra: { path: string; label: string }[] = []
  if (posts.length) extra.push({ path: '/posts', label: 'News' })
  if (occurrences(events, { limit: 1 }).length) extra.push({ path: '/events', label: 'Events' })
  return [...site.nav.map((p) => ({ path: p.path, label: p.label })), ...extra, ...pages.map((p) => ({ path: `/${p.slug}`, label: p.title }))]
}
