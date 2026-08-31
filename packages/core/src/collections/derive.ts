import { getTableColumns, getTableName } from 'drizzle-orm'
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { columnEnums } from '../db/schema'
import { richTextDocSchema } from '../richtext/schema'
import type { Field, FieldOverride, FieldType } from './types'

const SYSTEM_COLUMNS = new Set(['id', 'createdAt', 'updatedAt'])
const TEXTAREA_NAMES = new Set(['excerpt', 'description', 'message', 'help', 'summary'])
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function humanise(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\bid\b/i, 'ID')
    .replace(/^./, (c) => c.toUpperCase())
}

function mediaFkColumns(table: PgTable): Set<string> {
  const out = new Set<string>()
  for (const fk of getTableConfig(table).foreignKeys) {
    const ref = fk.reference()
    if (getTableName(ref.foreignTable) === 'media') {
      for (const c of ref.columns) out.add(c.name)
    }
  }
  return out
}

/** Field defaults derived from the Drizzle column (SPEC §6), then overrides applied. */
export function deriveFields(table: PgTable, overrides: Record<string, FieldOverride> = {}): Record<string, Field> {
  const tableName = getTableName(table)
  const enums = columnEnums[tableName] ?? {}
  const mediaFks = mediaFkColumns(table)
  const fields: Record<string, Field> = {}

  for (const [prop, col] of Object.entries(getTableColumns(table))) {
    if (SYSTEM_COLUMNS.has(prop)) continue
    let type: FieldType
    const ct = col.columnType
    if (prop === 'slug') type = 'slug'
    else if (enums[prop]) type = 'select'
    else if (mediaFks.has(col.name)) type = 'image'
    else if (ct === 'PgJsonb' || ct === 'PgJson') type = 'richtext'
    else if (ct === 'PgTimestamp' || ct === 'PgTimestampString') type = 'datetime'
    else if (ct === 'PgDate' || ct === 'PgDateString') type = 'date'
    else if (ct === 'PgBoolean') type = 'boolean'
    else if (ct === 'PgInteger' || ct === 'PgSmallInt' || ct === 'PgBigInt53' || ct === 'PgNumeric' || ct === 'PgReal' || ct === 'PgDoublePrecision') type = 'number'
    else if (TEXTAREA_NAMES.has(prop)) type = 'textarea'
    else type = 'text'

    const field: Field = {
      type,
      label: humanise(prop).replace(/ Media ID$/, ' image').replace(/ ID$/, ''),
      required: col.notNull && !col.hasDefault,
    }
    if (type === 'select') {
      field.options = enums[prop]!.map((v) => ({ value: v, label: humanise(v) }))
      if (col.hasDefault && col.default !== undefined) field.default = col.default
    }
    if (type === 'slug') field.from = 'title'
    fields[prop] = { ...field, ...overrides[prop] }
  }
  for (const k of Object.keys(overrides)) {
    if (!fields[k]) throw new Error(`Field override for unknown column "${k}" on ${tableName}`)
  }
  // A slug is derived from another field, so it belongs right after it in the form.
  const ordered: Record<string, Field> = {}
  const slugs = Object.entries(fields).filter(([, f]) => f.type === 'slug')
  for (const [name, f] of Object.entries(fields)) {
    if (f.type === 'slug') continue
    ordered[name] = f
    for (const [sn, sf] of slugs) if (sf.from === name) ordered[sn] = sf
  }
  for (const [sn, sf] of slugs) if (!ordered[sn]) ordered[sn] = sf
  return ordered
}

/** Insert/update zod schemas derived from the table + fields, declared once (SPEC §6). */
export function deriveSchemas(
  table: PgTable,
  fields: Record<string, Field>,
  refine?: (base: z.ZodObject) => z.ZodObject,
): { insertSchema: z.ZodObject; updateSchema: z.ZodObject } {
  const columns = getTableColumns(table)
  // Wrap replacements with the column's own nullability so a refinement never widens or narrows what the DB accepts.
  const forColumn = (name: string, inner: z.ZodType): z.ZodType => {
    const col = columns[name]!
    let s: z.ZodType = inner
    if (!col.notNull) s = s.nullable()
    if (!col.notNull || col.hasDefault) s = s.optional()
    return s
  }
  const refinements: Record<string, (s: z.ZodType) => z.ZodType> = {}
  for (const [name, f] of Object.entries(fields)) {
    if (f.type === 'richtext') refinements[name] = () => forColumn(name, richTextDocSchema)
    else if (f.type === 'slug') refinements[name] = () => forColumn(name, z.string().regex(SLUG_RE, 'lowercase letters, digits and hyphens').max(f.maxLength ?? 120))
    else if (f.type === 'datetime' || f.type === 'date') refinements[name] = () => forColumn(name, z.coerce.date())
    else if (f.type === 'image') refinements[name] = () => forColumn(name, z.uuid())
    else if (f.maxLength && (f.type === 'text' || f.type === 'textarea')) {
      const max = f.maxLength
      refinements[name] = () => forColumn(name, z.string().max(max))
    }
  }
  let base = createInsertSchema(table, refinements as never) as unknown as z.ZodObject
  base = base.omit({ id: true, createdAt: true, updatedAt: true } as never)
  if (refine) base = refine(base)
  return { insertSchema: base, updateSchema: base.partial() }
}
