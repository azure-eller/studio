import { and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { unstable_cache } from 'next/cache'
import type { Db } from '../db/client'
import { events, media, posts, type Event, type Media, type Post } from '../db/schema'

export const TAGS = {
  posts: 'posts',
  post: (slug: string) => `post:${slug}`,
  events: 'events',
  event: (slug: string) => `event:${slug}`,
  gallery: (collection: string) => `media:${collection}`,
} as const

export type PostWithCover = Post & { cover: Media | null }
export type EventWithCover = Event & { cover: Media | null }

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

/** The data cache stores JSON, so a cache hit returns `*At` timestamps as strings. Put the Dates back. */
export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveDates) as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = typeof v === 'string' && k.endsWith('At') && ISO.test(v) ? new Date(v) : reviveDates(v)
    }
    return out as T
  }
  return value
}

async function cached<T>(fn: () => Promise<T>, keyParts: string[], tags: string[]): Promise<T> {
  return reviveDates(await unstable_cache(fn, ['studio-core', ...keyParts], { tags })())
}

const cover = alias(media, 'cover')
const publishedPost = () => and(eq(posts.status, 'published'), lte(posts.publishedAt, sql`now()`))
const publishedEvent = () => eq(events.status, 'published')

export const content = {
  getPosts(db: Db, opts: { limit?: number } = {}): Promise<PostWithCover[]> {
    const limit = Math.min(opts.limit ?? 50, 200)
    return cached(
      async () => {
        const rows = await db
          .select({ post: posts, cover })
          .from(posts)
          .leftJoin(cover, eq(posts.coverMediaId, cover.id))
          .where(publishedPost())
          .orderBy(desc(posts.publishedAt))
          .limit(limit)
        return rows.map((r) => ({ ...r.post, cover: r.cover }))
      },
      ['posts', String(limit)],
      [TAGS.posts],
    )
  },

  getPost(db: Db, slug: string): Promise<PostWithCover | null> {
    return cached(
      async () => {
        const rows = await db
          .select({ post: posts, cover })
          .from(posts)
          .leftJoin(cover, eq(posts.coverMediaId, cover.id))
          .where(and(eq(posts.slug, slug), publishedPost()))
          .limit(1)
        const r = rows[0]
        return r ? { ...r.post, cover: r.cover } : null
      },
      ['post', slug],
      [TAGS.posts, TAGS.post(slug)],
    )
  },

  getEvents(db: Db, opts: { upcoming?: boolean; limit?: number } = {}): Promise<EventWithCover[]> {
    const limit = Math.min(opts.limit ?? 50, 200)
    const upcoming = opts.upcoming ?? true
    return cached(
      async () => {
        const where = upcoming
          ? and(
              publishedEvent(),
              or(gte(events.endsAt, sql`now()`), and(isNull(events.endsAt), gte(events.startsAt, sql`now()`))),
            )
          : publishedEvent()
        const rows = await db
          .select({ event: events, cover })
          .from(events)
          .leftJoin(cover, eq(events.coverMediaId, cover.id))
          .where(where)
          .orderBy(upcoming ? asc(events.startsAt) : desc(events.startsAt))
          .limit(limit)
        return rows.map((r) => ({ ...r.event, cover: r.cover }))
      },
      ['events', upcoming ? 'upcoming' : 'all', String(limit)],
      [TAGS.events],
    )
  },

  getEvent(db: Db, slug: string): Promise<EventWithCover | null> {
    return cached(
      async () => {
        const rows = await db
          .select({ event: events, cover })
          .from(events)
          .leftJoin(cover, eq(events.coverMediaId, cover.id))
          .where(and(eq(events.slug, slug), publishedEvent()))
          .limit(1)
        const r = rows[0]
        return r ? { ...r.event, cover: r.cover } : null
      },
      ['event', slug],
      [TAGS.events, TAGS.event(slug)],
    )
  },

  getGallery(db: Db, collection: string): Promise<Media[]> {
    return cached(
      () =>
        db
          .select()
          .from(media)
          .where(and(eq(media.collection, collection), sql`${media.confirmedAt} is not null`))
          .orderBy(asc(media.sort), asc(media.createdAt)),
      ['gallery', collection],
      [TAGS.gallery(collection)],
    )
  },

  mediaUrl(mediaBaseUrl: string, m: Pick<Media, 'key'>): string {
    // A key starting with "/" is a file committed to the site repo's public/ (photos sourced during the build).
    return m.key.startsWith('/') ? m.key : `${mediaBaseUrl}/${m.key}`
  },
}
