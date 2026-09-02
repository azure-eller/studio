/** Pure display helpers for the admin: labels, dates, cell text, CSV. No React, no fetch. */
import type { CollectionMeta, Field } from '../collections/types'
import { docToText } from '../richtext/schema'

export type Row = Record<string, unknown>

const SYSTEM_LABELS: Record<string, string> = { createdAt: 'Created', updatedAt: 'Updated', readAt: 'Read', id: 'ID' }

export function labelFor(meta: CollectionMeta, prop: string): string {
  return meta.fields[prop]?.label ?? SYSTEM_LABELS[prop] ?? humanise(prop)
}

export function humanise(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

const isDoc = (v: unknown): boolean => Boolean(v) && typeof v === 'object' && (v as { type?: string }).type === 'doc'

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

/** One line of plain text for a cell or a preview. Objects (form payloads) become their values in order. */
export function formatCell(field: Field | undefined, prop: string, v: unknown, max = 90): string {
  if (v === null || v === undefined || v === '') return '—'
  if (isDoc(v)) return clip(docToText(v as never), max)
  if (v instanceof Date || field?.type === 'datetime' || field?.type === 'date' || /At$/.test(prop)) return fmtDate(v, { time: field?.type !== 'date' })
  if (prop === 'amountCents' && typeof v === 'number') return (v / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
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

/** What to call a row when it has no obvious title. */
export function titleOf(row: Row, meta: CollectionMeta): string {
  for (const k of ['title', 'name', 'donorName', 'filename']) if (typeof row[k] === 'string' && row[k]) return row[k] as string
  const payload = row['payload']
  if (payload && typeof payload === 'object') {
    const p = payload as Row
    for (const k of ['name', 'email']) if (typeof p[k] === 'string' && p[k]) return p[k] as string
    return formatCell(undefined, 'payload', payload, 60)
  }
  return meta.labelSingular
}

/** The longest thing someone wrote in a form payload, for list previews. */
export function previewOf(row: Row, max = 70): string {
  const payload = row['payload']
  if (!payload || typeof payload !== 'object') return ''
  const longest = Object.entries(payload as Row)
    .filter(([k, v]) => k !== 'name' && k !== 'email' && typeof v === 'string' && v.trim())
    .sort((a, b) => (b[1] as string).length - (a[1] as string).length)[0]?.[1] as string | undefined
  return longest ? clip(longest.replace(/\s+/g, ' ').trim(), max) : ''
}

/** Public URL for a row, if the collection declares one and the row is published. */
export function publicUrl(meta: CollectionMeta, row: Row, siteUrl: string): string | null {
  if (!meta.publicPath || !siteUrl) return null
  if ('status' in meta.fields && row['status'] !== 'published') return null
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
