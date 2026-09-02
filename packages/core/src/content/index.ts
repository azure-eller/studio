import { and, desc, eq, getTableColumns, lte, sql, type SQL } from 'drizzle-orm'
import { alias, type PgTable } from 'drizzle-orm/pg-core'
import type { Cache } from '../cache'
import type { Collection, CollectionMap, Collections, Doc } from '../collections/types'
import type { Db } from '../db/client'
import { media } from '../db/schema'
import { mediaUrl } from '../storage/url'

/** Tags make edits instant; the time limit is what lets a scheduled post appear and a finished event leave "upcoming". */
export const CONTENT_REVALIDATE_SECONDS = 300

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

/** A cache stores JSON, so a hit returns `*At` timestamps as strings. Put the Dates back. */
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

export interface ListOptions {
  limit?: number
  /** One of the collection's declared `reads.filters`, e.g. `upcoming`. */
  filter?: string
  /** Equality on visible columns, e.g. `{ collection: 'spring' }` for a gallery. */
  where?: Record<string, string | number | boolean | null>
}

/** Typed public reads over every collection, derived from the same definition the admin uses. */
export interface Content<M extends CollectionMap> {
  list<K extends keyof M & string>(name: K, opts?: ListOptions): Promise<Doc<M[K]>[]>
  /** By slug when the collection has one, else by id. Published rows only. */
  get<K extends keyof M & string>(name: K, slugOrId: string): Promise<Doc<M[K]> | null>
  mediaUrl(key: string): string
}

type Cols = Record<string, never>
const cover = alias(media, 'cover')

/** "Public" for a collection: published (and past its date) rows, plus whatever the collection's reads declare. */
function publicWhere(c: Collection): SQL | undefined {
  const cols = getTableColumns(c.table) as Cols
  const parts: (SQL | undefined)[] = []
  if (c.publishable) {
    parts.push(eq(cols['status']!, 'published'))
    if ('publishedAt' in cols) parts.push(lte(cols['publishedAt']!, sql`now()`))
  }
  if (c.reads.filter) parts.push(c.reads.filter(c.table as never))
  return and(...parts.filter(Boolean))
}

export function createContent<M extends CollectionMap>(db: Db, collections: Collections<M>, cache: Cache, mediaBaseUrl: string): Content<M> {
  const of = (name: string): Collection => {
    const c = (collections.byName as CollectionMap)[name]
    if (!c) throw new Error(`Unknown collection "${name}"`)
    return c
  }
  // A collection's image field (cover_media_id) rides along on every public row as `cover`.
  const coverColumn = (c: Collection) => {
    const key = Object.entries(c.fields).find(([, f]) => f.type === 'image')?.[0]
    return key ? (getTableColumns(c.table) as Cols)[key]! : null
  }
  const select = async (c: Collection, where: SQL | undefined, order: SQL[], limit: number): Promise<Record<string, unknown>[]> => {
    const fk = coverColumn(c)
    const table = c.table as PgTable
    if (fk) {
      const rows = await db.select({ row: table, cover }).from(table).leftJoin(cover, eq(fk, cover.id)).where(where).orderBy(...order).limit(limit)
      return rows.map((r) => ({ ...(r.row as object), cover: r.cover }))
    }
    const rows = await db.select({ row: table }).from(table).where(where).orderBy(...order).limit(limit)
    return rows.map((r) => ({ ...(r.row as object), cover: null }))
  }
  const cached = <T>(fn: () => Promise<T>, key: string[], tags: string[]): Promise<T> =>
    cache.wrap(fn, ['studio-core', ...key], { tags, revalidate: CONTENT_REVALIDATE_SECONDS })().then(reviveDates)

  return {
    list(name, opts = {}) {
      const c = of(name)
      const limit = Math.min(opts.limit ?? 50, 200)
      const cols = getTableColumns(c.table) as Cols
      const named = opts.filter ? c.reads.filters?.[opts.filter] : undefined
      if (opts.filter && !named) throw new Error(`Collection "${name}" has no filter "${opts.filter}"`)
      const eqs = Object.entries(opts.where ?? {}).map(([k, v]) => {
        if (!c.fields[k] || c.fields[k]!.hidden) throw new Error(`Cannot filter "${name}" by "${k}"`)
        return v === null ? sql`${cols[k]} is null` : eq(cols[k]!, v)
      })
      const where = and(publicWhere(c), named?.where(c.table as never), ...eqs)
      const order = (named?.order ?? c.reads.order)?.(c.table as never) ?? [desc(cols[c.dateField]!)]
      // Reads declare only their own tag; writes fan out to dependents (see `tagsFor`).
      return cached(() => select(c, where, order, limit), [name, 'list', JSON.stringify(opts)], [c.name]) as never
    },
    get(name, slugOrId) {
      const c = of(name)
      const cols = getTableColumns(c.table) as Cols
      const by = c.slugged ? eq(cols['slug']!, slugOrId) : eq(cols['id']!, slugOrId)
      const tags = c.slugged ? [c.name, `${c.name}:${slugOrId}`] : [c.name]
      return cached(() => select(c, and(publicWhere(c), by), [], 1).then((r) => r[0] ?? null), [name, 'get', slugOrId], tags) as never
    },
    mediaUrl: (key) => mediaUrl(mediaBaseUrl, key),
  }
}
