/** Pure display helpers for the admin: labels, dates, cell text, CSV. No React, no fetch. */
import { humanise } from '../collections/humanise'
import type { CollectionMeta, Field } from '../collections/types'
import { REPEAT_OPTIONS, ruleToRepeat } from '../content/events'
import { docToText } from '../richtext/schema'

export type Row = Record<string, unknown>
export { humanise }

const SYSTEM_LABELS: Record<string, string> = { createdAt: 'Created', updatedAt: 'Updated', readAt: 'Read', id: 'ID' }

export function labelFor(meta: CollectionMeta, prop: string): string {
  return meta.fields[prop]?.label ?? SYSTEM_LABELS[prop] ?? humanise(prop)
}

const isDoc = (v: unknown): boolean => Boolean(v) && typeof v === 'object' && (v as { type?: string }).type === 'doc'
/** Declared date fields, and the system `…At` columns. */
export const isDateProp = (field: Field | undefined, prop: string): boolean => field?.type === 'datetime' || field?.type === 'date' || (!field && /At$/.test(prop))
export const isFuture = (v: unknown, now = new Date()): boolean => Boolean(v) && new Date(v as string) > now
/** A media row that is a picture (the rest are files). */
export const isImageRow = (row: Row): boolean => String(row['mime'] ?? '').startsWith('image/')

export type PublishState = 'draft' | 'scheduled' | 'published'

/** Where a row stands on the site; null for collections without a publish flow. A row not yet saved is a draft. */
export function publishState(meta: CollectionMeta, row: Row, now = new Date()): PublishState | null {
  if (!meta.publishable) return null
  if (row['status'] !== 'published') return 'draft'
  return isFuture(row['publishedAt'], now) ? 'scheduled' : 'published'
}

/** "Every two weeks until Dec 31" for a repeat rule; rules the picker cannot express read as custom. */
export function repeatLabel(rule: unknown): string {
  if (!rule || typeof rule !== 'string') return 'Does not repeat'
  const r = ruleToRepeat(rule)
  if (!r) return 'Custom repeat'
  const base = REPEAT_OPTIONS.find((o) => o.value === r.freq)!.label
  return r.until ? `${base} until ${fmtDate(r.until, { time: false })}` : base
}

/** "Today, 3:12 PM" · "Yesterday, 9:04 AM" · "Sep 1, 3:12 PM" · "Sep 1, 2025". */
export function fmtDate(v: unknown, opts: { time?: boolean } = {}, now = new Date()): string {
  const d = v instanceof Date ? v : new Date(v as string)
  if (Number.isNaN(d.getTime())) return String(v)
  const withTime = opts.time ?? true
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay(d, now)) return withTime ? `Today, ${time}` : 'Today'
  if (sameDay(d, yesterday)) return withTime ? `Yesterday, ${time}` : 'Yesterday'
  const sameYear = d.getFullYear() === now.getFullYear()
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  return withTime && sameYear ? `${date}, ${time}` : date
}

function money(cents: number, currency: string): string {
  try {
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase() })
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

/** One line of plain text for a cell or a preview. `row` supplies context such as the currency of a money field. */
export function formatCell(field: Field | undefined, prop: string, v: unknown, max = 90, row?: Row): string {
  if (v === null || v === undefined || v === '') return '—'
  if (isDoc(v)) return clip(docToText(v as never), max)
  if (v instanceof Date || isDateProp(field, prop)) return fmtDate(v, { time: field?.type !== 'date' })
  if (field?.format === 'money' && typeof v === 'number') return money(v, typeof row?.['currency'] === 'string' ? (row['currency'] as string) : 'usd')
  if (field?.format === 'rrule') return repeatLabel(v)
  if (field?.type === 'boolean') return v ? 'Yes' : 'No'
  if (field?.type === 'select') return field.options?.find((o) => o.value === v)?.label ?? humanise(String(v))
  if (typeof v === 'object') {
    const parts = Object.values(v as Row)
      .filter((x) => typeof x === 'string' && x.trim())
      .map((x) => (x as string).replace(/\s+/g, ' ').trim())
    return clip(parts.join(' · '), max)
  }
  return clip(String(v), max)
}

export function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

/**
 * Form submissions store what the visitor typed as a `payload` object. The public forms (SPEC §2.2) all carry
 * `name` and/or `email`, so those two keys are the convention the admin reads a sender from.
 */
export function submissionOf(row: Row): { name: string; email: string; entries: [string, unknown][] } | null {
  const payload = row['payload']
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Row
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return { name: str(p['name']), email: str(p['email']), entries: Object.entries(p).filter(([k, v]) => k !== 'name' && k !== 'email' && v !== null && v !== undefined && v !== '') }
}

/** What to call a row: its declared title field, else who sent it, else the singular label. */
export function titleOf(row: Row, meta: CollectionMeta): string {
  const t = meta.titleField ? row[meta.titleField] : undefined
  if (typeof t === 'string' && t) return t
  const s = submissionOf(row)
  return s?.name || s?.email || meta.labelSingular
}

/** The longest thing someone wrote in a form payload, for list previews. */
export function previewOf(row: Row, max = 70): string {
  const s = submissionOf(row)
  const longest = s?.entries.map(([, v]) => String(v)).sort((a, b) => b.length - a.length)[0]
  return longest ? clip(longest.replace(/\s+/g, ' ').trim(), max) : ''
}

export interface Detail {
  label: string
  text: string
}

/**
 * A read-only row (a message, a donation) as a person reads it: who, their email, the longest thing they wrote as
 * the body, and every other value as a labelled detail. `form` names which public form it came from.
 */
export function detailsOf(meta: CollectionMeta, row: Row): { name: string; email: string; form: string | null; body: Detail | null; details: Detail[] } {
  const sub = submissionOf(row)
  const emailKey = Object.keys(row).find((k) => /email$/i.test(k) && typeof row[k] === 'string' && row[k])
  const email = (emailKey ? String(row[emailKey]) : '') || sub?.email || ''
  const shown = new Set(['id', 'createdAt', 'updatedAt', 'readAt', 'payload', 'form', meta.titleField ?? '', emailKey ?? ''])
  const entries = sub?.entries ?? []
  const longest = [...entries].sort((a, b) => String(b[1]).length - String(a[1]).length)[0]
  const details: Detail[] = [
    ...entries.filter((e) => e !== longest).map(([k, v]) => ({ label: humanise(k), text: String(v) })),
    ...Object.entries(row)
      .filter(([k, v]) => !shown.has(k) && v !== null && v !== '')
      .map(([k, v]) => ({ label: labelFor(meta, k), text: formatCell(meta.fields[k], k, v, 500, row) })),
  ]
  return { name: titleOf(row, meta), email, form: typeof row['form'] === 'string' ? formatCell(meta.fields['form'], 'form', row['form']) : null, body: longest ? { label: humanise(longest[0]), text: String(longest[1]) } : null, details }
}

/** Public URL for a row, if the collection declares one and the row is published. */
export function rowUrl(meta: CollectionMeta, row: Row, siteUrl: string): string | null {
  if (!meta.publicPath || !siteUrl) return null
  if (meta.publishable && row['status'] !== 'published') return null
  const path = meta.publicPath.replace(/:([a-zA-Z]+)/g, (_, k: string) => encodeURIComponent(String(row[k] ?? '')))
  return path.includes('//') || /\/$/.test(path) ? null : `${siteUrl.replace(/\/+$/, '')}${path}`
}

export function exportCsv(meta: CollectionMeta, rows: Row[]): void {
  // Flatten payload JSON (form submissions) into columns so the file opens cleanly in a spreadsheet.
  const payloadKeys = [...new Set(rows.flatMap((r) => (r['payload'] && typeof r['payload'] === 'object' ? Object.keys(r['payload'] as Row) : [])))]
  const base = [...new Set(['createdAt', ...meta.list.columns])].filter((c) => c !== 'payload')
  const headers = [...base.map((c) => labelFor(meta, c)), ...payloadKeys.map(humanise)]
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [headers.join(','), ...rows.map((r) => [...base.map((c) => cell(r[c])), ...payloadKeys.map((k) => cell((r['payload'] as Row | undefined)?.[k]))].join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${meta.name}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
