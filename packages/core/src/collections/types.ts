import type { InferSelectModel, SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { z } from 'zod'
import type { Media } from '../db/schema'

export type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'date' | 'datetime' | 'boolean' | 'select' | 'slug' | 'number'

export interface Field {
  type: FieldType
  label: string
  required: boolean
  help?: string
  options?: { value: string; label: string }[]
  /** slug only: source field */
  from?: string
  maxLength?: number
  /** omitted from the form; server fills it (defaults) or it is system-managed */
  hidden?: boolean
  /** value applied on create when the form omits it */
  default?: unknown
  /** display: `money` = integer cents in the row's `currency`; `rrule` = a repeat rule edited as frequency + until */
  format?: 'money' | 'rrule'
}

export type FieldOverride = Partial<Field>

export interface ListConfig {
  columns: string[]
  sort: [string, 'asc' | 'desc']
  search?: string[]
}

/** How the public site reads a collection. Everything here has a derived default; declare only what differs. */
export interface ReadsConfig<T extends PgTable> {
  /** Extra predicate on top of "published" (e.g. media: only confirmed uploads). */
  filter?: (t: T) => SQL
  /** Default order. Derived: newest `dateField` first. */
  order?: (t: T) => SQL[]
  /** Named alternatives callable as `content.list(name, { filter: 'upcoming' })`. */
  filters?: Record<string, { where: (t: T) => SQL; order?: (t: T) => SQL[] }>
}

export interface CollectionConfig<T extends PgTable = PgTable> {
  table: T
  label: string
  labelSingular?: string
  fields?: Record<string, FieldOverride>
  list: ListConfig
  readOnly?: boolean
  /** How the admin lists rows: a table (default) or a tile grid (files). */
  view?: 'table' | 'grid'
  /** Public URL pattern for a row, e.g. `/posts/:slug`; enables "View on site". */
  publicPath?: string
  /** Which field names a row in lists (default: `title` when the table has one). */
  titleField?: string
  /** Which date a row is listed by (default: `publishedAt`, `startsAt`, else `createdAt`). */
  dateField?: string
  /** Exactly one row (site settings): the admin opens the form directly; `content.get(name)` returns it. */
  singleton?: boolean
  reads?: ReadsConfig<T>
  /** Refinements on the derived zod schema. */
  schema?: (base: z.ZodObject) => z.ZodObject
}

/** Server-side collection: table + everything derived from it. */
export interface Collection<T extends PgTable = PgTable> {
  name: string
  table: T
  label: string
  labelSingular: string
  fields: Record<string, Field>
  list: ListConfig
  readOnly: boolean
  view: 'table' | 'grid'
  publicPath: string | null
  titleField: string | null
  dateField: string
  /** Has a `readAt` column: rows are messages with an unread state. */
  inbox: boolean
  /** Has a draft/published `status`: public reads see only published rows; the admin shows a publish control. */
  publishable: boolean
  /** `slug` column: rows have a public identity and a row-level cache tag. */
  slugged: boolean
  singleton: boolean
  /** Names of collections whose tables reference this one; a write here revalidates them too. */
  dependents: string[]
  /** Callbacks are typed `never` so a collection over a specific table is assignable to the generic map; content calls them with its own table. */
  reads: ReadsConfig<never>
  insertSchema: z.ZodObject
  updateSchema: z.ZodObject
}

/** JSON-serialisable description the admin screens render from. No Drizzle objects, no functions. */
export interface CollectionMeta {
  name: string
  label: string
  labelSingular: string
  fields: Record<string, Field>
  list: ListConfig
  readOnly: boolean
  view: 'table' | 'grid'
  publicPath: string | null
  titleField: string | null
  dateField: string
  inbox: boolean
  publishable: boolean
  singleton: boolean
}

export type CollectionMap = Record<string, Collection>

export interface Collections<M extends CollectionMap = CollectionMap> {
  byName: M
  meta: CollectionMeta[]
}

/** A public row: the table's row plus its cover image, when the collection has one. */
export type Doc<C> = C extends Collection<infer T> ? InferSelectModel<T> & { cover: Media | null } : never
