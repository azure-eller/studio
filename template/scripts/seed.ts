/** `pnpm db:seed` — idempotent: media, posts, events, gallery collections and (once) settings from brief.json. */
import { createDb, docFromText, env, schema } from '@studio/core'
import fs from 'node:fs'
import path from 'node:path'
import { briefSchema } from '../lib/brief'

const brief = briefSchema.parse(JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../brief.json'), 'utf8')))
const db = createDb(env.DATABASE_URL)
const now = new Date()
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
const mimeOf = (key: string) => {
  const ext = key.split('.').pop()?.toLowerCase()
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', svg: 'image/svg+xml', pdf: 'application/pdf' } as Record<string, string>)[ext ?? ''] ?? 'image/jpeg'
}

// media: every brief photo (and logo) exists as a confirmed row; gallery membership from seed.galleryCollections
const collectionOf = new Map<string, { name: string; sort: number }>()
for (const g of brief.seed.galleryCollections ?? []) g.photoKeys.forEach((k, i) => collectionOf.set(k, { name: g.name, sort: i }))
const images = [...brief.media.photos, ...(brief.media.logo ? [brief.media.logo] : [])]
const mediaIds = new Map<string, string>()
for (const img of images) {
  const c = collectionOf.get(img.key)
  const [row] = await db
    .insert(schema.media)
    .values({
      key: img.key,
      filename: img.key.split('/').pop() ?? img.key,
      mime: mimeOf(img.key),
      sizeBytes: 0,
      width: img.width,
      height: img.height,
      alt: img.alt ?? img.caption ?? '',
      collection: c?.name ?? null,
      sort: c?.sort ?? 0,
      confirmedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.media.key,
      set: { width: img.width, height: img.height, alt: img.alt ?? img.caption ?? '', collection: c?.name ?? null, sort: c?.sort ?? 0, confirmedAt: now },
    })
    .returning({ id: schema.media.id })
  mediaIds.set(img.key, row!.id)
}

// posts: published, staggered so lists have an order
const posts = brief.seed.posts ?? []
for (const [i, p] of posts.entries()) {
  const publishedAt = new Date(now.getTime() - i * 86_400_000)
  const values = {
    slug: slugify(p.title),
    title: p.title,
    excerpt: p.body.split(/\n\s*\n/)[0]!.slice(0, 280),
    body: docFromText(p.body),
    coverMediaId: p.coverPhotoKey ? (mediaIds.get(p.coverPhotoKey) ?? null) : null,
    status: 'published' as const,
    publishedAt,
  }
  await db.insert(schema.posts).values(values).onConflictDoUpdate({ target: schema.posts.slug, set: { ...values, publishedAt: undefined } })
}

// events
for (const e of brief.seed.events ?? []) {
  const values = {
    slug: slugify(`${e.title}-${e.startsAt.slice(0, 10)}`),
    title: e.title,
    description: docFromText(e.description ?? ''),
    startsAt: new Date(e.startsAt),
    endsAt: e.endsAt ? new Date(e.endsAt) : null,
    timezone: brief.timezone,
    location: e.location ?? null,
    url: e.url ?? null,
    status: 'published' as const,
  }
  await db.insert(schema.events).values(values).onConflictDoUpdate({ target: schema.events.slug, set: values })
}
// settings: the details the owner edits in the admin; seeded once from the brief, then theirs.
const existing = await db.select({ id: schema.settings.id }).from(schema.settings).limit(1)
if (!existing[0]) {
  const a = brief.contact.address
  const soc = brief.socials ?? {}
  await db.insert(schema.settings).values({
    name: brief.org.name,
    tagline: brief.org.tagline,
    email: brief.contact.email,
    phone: brief.contact.phone ?? null,
    address: a ? `${a.street}\n${a.city}, ${a.region} ${a.postal}` : null,
    hours: brief.contact.hours ?? null,
    facebook: soc.facebook ?? null,
    instagram: soc.instagram ?? null,
    youtube: soc.youtube ?? null,
  })
}
console.log(`seeded ${images.length} media, ${posts.length} posts, ${(brief.seed.events ?? []).length} events`)
