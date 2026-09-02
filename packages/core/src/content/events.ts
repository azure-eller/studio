/**
 * Recurring events. A row is the master (its `startsAt` is the first date, `recurrence` an RRULE); this expands it
 * into the dated occurrences a page shows. Pure: no database, so any frontend can call it on `content.list` rows.
 */
// rrule is a dual package: Node resolves its UMD `main` (the API sits on `default`), bundlers its ESM `module`
// (named exports). Accept either shape so the same code runs in scripts, tests and the site build.
import * as rrulePkg from 'rrule'
import type { RRule } from 'rrule'
const api = ('RRule' in rrulePkg ? rrulePkg : (rrulePkg as unknown as { default: typeof rrulePkg }).default) as typeof rrulePkg
const { rrulestr } = api

export interface Occurrence<E> {
  event: E
  startsAt: Date
  endsAt: Date | null
  /** `<slug>` for a one-off, `<slug>@<ISO start>` for a repeat, so a page can address one date. */
  key: string
}

type EventLike = { slug: string; startsAt: Date; endsAt: Date | null; recurrence?: string | null }

/** The dated occurrences of `events` in [from, to], soonest first. One-offs appear once; repeats as many times as they fall in range. */
export function occurrences<E extends EventLike>(events: E[], opts: { from?: Date; to?: Date; limit?: number } = {}): Occurrence<E>[] {
  const from = opts.from ?? new Date()
  const to = opts.to ?? new Date(from.getTime() + 365 * 86_400_000)
  const out: Occurrence<E>[] = []
  for (const e of events) {
    const duration = e.endsAt ? e.endsAt.getTime() - e.startsAt.getTime() : 0
    if (!e.recurrence) {
      const end = e.endsAt ?? e.startsAt
      if (end >= from && e.startsAt <= to) out.push({ event: e, startsAt: e.startsAt, endsAt: e.endsAt, key: e.slug })
      continue
    }
    let rule: RRule
    try {
      rule = rrulestr(`DTSTART:${toIcs(e.startsAt)}\nRRULE:${e.recurrence}`) as RRule
    } catch {
      continue // a bad rule shows the first date only, rather than nothing
    }
    // An occurrence still in progress counts, so look back by the duration.
    for (const d of rule.between(new Date(from.getTime() - duration), to, true)) {
      out.push({ event: e, startsAt: d, endsAt: duration ? new Date(d.getTime() + duration) : null, key: `${e.slug}@${d.toISOString()}` })
    }
  }
  out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  return out.slice(0, opts.limit ?? 100)
}

/** The next dated occurrence of one event on or after `from`, or null when it has finished. */
export function nextOccurrence<E extends EventLike>(event: E, from = new Date()): Occurrence<E> | null {
  return occurrences([event], { from, limit: 1 })[0] ?? null
}

export type Repeat = { freq: 'daily' | 'weekly' | 'biweekly' | 'monthly'; until?: Date | null }

/** The admin's compact picker ↔ RRULE. Weekly rules repeat on the start date's weekday, which is what rrule does by default. */
export function repeatToRule(r: Repeat | null): string | null {
  if (!r) return null
  const freq = { daily: 'DAILY', weekly: 'WEEKLY', biweekly: 'WEEKLY', monthly: 'MONTHLY' }[r.freq]
  const parts = [`FREQ=${freq}`]
  if (r.freq === 'biweekly') parts.push('INTERVAL=2')
  if (r.until) parts.push(`UNTIL=${toIcs(endOfDay(r.until))}`)
  return parts.join(';')
}

export function ruleToRepeat(rule: string | null | undefined): Repeat | null {
  if (!rule) return null
  const get = (k: string) => rule.match(new RegExp(`(?:^|;)${k}=([^;]+)`))?.[1]
  const f = get('FREQ')
  const interval = Number(get('INTERVAL') ?? 1)
  const until = get('UNTIL')
  const freq = f === 'DAILY' ? 'daily' : f === 'MONTHLY' ? 'monthly' : f === 'WEEKLY' && interval === 2 ? 'biweekly' : f === 'WEEKLY' ? 'weekly' : null
  if (!freq) return null
  return { freq, until: until ? fromIcs(until) : null }
}

const endOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
export const toIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const fromIcs = (s: string) => new Date(s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/, '$1-$2-$3T$4:$5:$6Z'))

/** An iCalendar file for one occurrence, for "Add to calendar". Hand-rolled: escaping, CRLF, 75-octet folding. */
export function icsFor(o: { uid: string; title: string; startsAt: Date; endsAt: Date | null; location?: string | null; description?: string; url?: string; siteName: string }): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
  const end = o.endsAt ?? new Date(o.startsAt.getTime() + 60 * 60_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${esc(o.siteName)}//studio//EN`,
    'BEGIN:VEVENT',
    `UID:${esc(o.uid)}`,
    `DTSTAMP:${toIcs(new Date())}`,
    `DTSTART:${toIcs(o.startsAt)}`,
    `DTEND:${toIcs(end)}`,
    `SUMMARY:${esc(o.title)}`,
    ...(o.location ? [`LOCATION:${esc(o.location)}`] : []),
    ...(o.description ? [`DESCRIPTION:${esc(o.description)}`] : []),
    ...(o.url ? [`URL:${esc(o.url)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const out: string[] = []
  let i = 0
  while (i < bytes.length) {
    let n = Math.min(i === 0 ? 75 : 74, bytes.length - i)
    while (n > 1 && (bytes[i + n]! & 0xc0) === 0x80) n-- // never split a UTF-8 sequence
    out.push((i === 0 ? '' : ' ') + bytes.subarray(i, i + n).toString('utf8'))
    i += n
  }
  return out.join('\r\n')
}
