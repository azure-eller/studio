/** The record form's rules, as plain functions so they are testable without React: request bodies, save outcomes, slugs. */
import type { CollectionMeta, Field } from '../collections/types'
import { isFuture, type Row } from './format'

export type SaveOutcome = 'published' | 'unpublished' | 'scheduled' | 'draft' | 'saved'

/** What a save did, from the row before and after. */
export function saveOutcome(meta: CollectionMeta, before: Row, after: Row, now = new Date()): SaveOutcome {
  if (!meta.publishable) return 'saved'
  const was = before['status'] === 'published'
  const is = after['status'] === 'published'
  if (is && isFuture(after['publishedAt'], now)) return 'scheduled'
  if (is && !was) return 'published'
  if (!is && was) return 'unpublished'
  return is ? 'saved' : 'draft'
}

const NULLABLE_WHEN_EMPTY = new Set<Field['type']>(['select', 'image', 'date', 'datetime', 'number'])

/**
 * The request body for a save: the visible fields, an empty control sent as null where the column is not text,
 * declared defaults filled in on create. `status` overrides the row's; `clearPublishedAt` makes "publish now"
 * drop a scheduled date so the server stamps the current time.
 */
export function formBody(fields: [string, Field][], row: Row, o: { creating: boolean; status?: string | undefined; clearPublishedAt?: boolean }): Row {
  const b: Row = {}
  for (const [k, f] of fields) {
    let v = row[k]
    if ((v === undefined || v === '') && f.default !== undefined && o.creating) v = f.default
    if (v === '' && NULLABLE_WHEN_EMPTY.has(f.type)) v = null
    if (v !== undefined) b[k] = v
  }
  if (o.status) b['status'] = o.status
  if (o.clearPublishedAt) b['publishedAt'] = null
  return b
}

/** A copy of `row` as a new draft: "(copy)" on the title, a suffix on every slug, never published. */
export function duplicateBody(meta: CollectionMeta, fields: [string, Field][], row: Row, suffix = Date.now().toString(36).slice(-4)): Row {
  const b: Row = {}
  for (const [k] of fields) if (row[k] !== undefined && row[k] !== null) b[k] = row[k]
  if (meta.titleField && typeof b[meta.titleField] === 'string') b[meta.titleField] = `${b[meta.titleField]} (copy)`
  for (const [k, f] of fields) if (f.type === 'slug' && typeof b[k] === 'string') b[k] = `${b[k]}-copy-${suffix}`
  if (meta.publishable) {
    b['status'] = 'draft'
    if ('publishedAt' in meta.fields) b['publishedAt'] = null
  }
  return b
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
