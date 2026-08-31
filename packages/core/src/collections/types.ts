import type { PgTable } from 'drizzle-orm/pg-core'
import type { z } from 'zod'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'slug'
  | 'number'

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
}

export type FieldOverride = Partial<Field>

export interface ListConfig {
  columns: string[]
  sort: [string, 'asc' | 'desc']
  search?: string[]
}

export interface CollectionConfig<T extends PgTable = PgTable> {
  table: T
  label: string
  labelSingular?: string
  fields?: Record<string, FieldOverride>
  list: ListConfig
  readOnly?: boolean
  /** Cache tags to revalidate after a write. Receives the row (new and, on update, old). */
  revalidate: string[] | ((row: Record<string, unknown>) => string[])
  /** Refinements on the derived zod schema. */
  schema?: (base: z.ZodObject) => z.ZodObject
}

/** Server-side collection: table + derived fields + derived validation. */
export interface Collection<T extends PgTable = PgTable> {
  name: string
  table: T
  label: string
  labelSingular: string
  fields: Record<string, Field>
  list: ListConfig
  readOnly: boolean
  revalidate: (row: Record<string, unknown>) => string[]
  insertSchema: z.ZodObject
  updateSchema: z.ZodObject
}

/** JSON-serialisable description sent to AdminApp. No Drizzle objects, no functions. */
export interface CollectionMeta {
  name: string
  label: string
  labelSingular: string
  fields: Record<string, Field>
  list: ListConfig
  readOnly: boolean
}

export interface Collections {
  byName: Record<string, Collection>
  meta: CollectionMeta[]
}
