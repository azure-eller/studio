/**
 * Recurring events. A row is the master (its `startsAt` is the first date, `recurrence` an RRULE); this expands it
 * into the dated occurrences a page shows. Pure: no database, so any frontend can call it on `content.list` rows.
 */
// rrule is a dual package: Node resolves its UMD `main` (the API sits on `default`), bundlers its ESM `module`
// (named exports). Accept either shape so the same code runs in scripts, tests and the site build.
import * as rrulePkg from 'rrule'
import type { Options } from 'rrule'
const api = ('RRule' in rrulePkg ? rrulePkg : (rrulePkg as unknown as { default: typeof rrulePkg }).default) as typeof rrulePkg
const { RRule, rrulestr } = api

export interface Occurrence<E> {
  event: E
  startsAt: Date
  endsAt: Date | null
  /** `<slug>` for a one-off, `<slug>@<ISO start>` for a repeat: stable across renders, unique within a list. */
  key: string
}

type EventLike = { slug: string; startsAt: Date; endsAt: Date | null; recurrence?: string | null; timezone?: string | null }

/* ---------- wall-clock time ----------
 * A repeat means "Sundays at 10" in the event's zone. rrule counts in zone-less ("floating") time, so the master is
 * expanded from its wall-clock digits and each result is turned back into an instant at that date's offset —
 * otherwise a weekly event would shift by an hour when daylight saving starts or ends. */

const formatters = new Map<string, Intl.DateTimeFormat | null>()
function formatter(tz: string): Intl.DateTimeFormat | null {
  if (!formatters.has(tz)) {
    try {
      formatters.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch {
      formatters.set(tz, null) // unknown zone: treat as UTC
    }
  }
  return formatters.get(tz) ?? null
}

/** The wall-clock digits of `d` in `tz`, as a UTC date (floating time). */
function toFloating(d: Date, tz: string): Date {
  const f = formatter(tz)
  if (!f) return d
  const p: Record<string, string> = {}
  for (const x of f.formatToParts(d)) p[x.type] = x.value
  return new Date(Date.UTC(+p['year']!, +p['month']! - 1, +p['day']!, +p['hour']!, +p['minute']!, +p['second']!))
}

/** The instant whose wall clock in `tz` reads as the floating `f`. */
function fromFloating(f: Date, tz: string): Date {
  if (!formatter(tz)) return f
  // The offset at (about) that time, then one correction for a DST edge between the guess and the answer.
  let instant = new Date(f.getTime() - (toFloating(f, tz).getTime() - f.getTime()))
  const drift = toFloating(instant, tz).getTime() - f.getTime()
  if (drift) instant = new Date(instant.getTime() - drift)
  return instant
}

/** The dated occurrences of `events` in [from, to], soonest first. One-offs appear once; repeats as many times as they fall in range. */
export function occurrences<E extends EventLike>(events: E[], opts: { from?: Date; to?: Date; limit?: number } = {}): Occurrence<E>[] {
  const from = opts.from ?? new Date()
  const to = opts.to ?? new Date(from.getTime() + 365 * 86_400_000)
  const out: Occurrence<E>[] = []
  for (const e of events) {
    const duration = e.endsAt ? e.endsAt.getTime() - e.startsAt.getTime() : 0
    const tz = e.timezone || 'UTC'
    let dates: Date[] | null = null
    if (e.recurrence) {
      try {
        const rule = rrulestr(`DTSTART:${toIcs(toFloating(e.startsAt, tz), false)}\nRRULE:${e.recurrence}`)
        // An occurrence still in progress counts, so look back by the duration.
        dates = rule.between(toFloating(new Date(from.getTime() - duration), tz), toFloating(to, tz), true).map((d) => fromFloating(d, tz))
      } catch {
        dates = null // a bad rule shows the first date only, rather than nothing
      }
    }
    for (const d of dates ?? [e.startsAt]) {
      const end = duration ? new Date(d.getTime() + duration) : null
      if ((end ?? d) < from || d > to) continue
      out.push({ event: e, startsAt: d, endsAt: end, key: dates ? `${e.slug}@${d.toISOString()}` : e.slug })
    }
  }
  out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  return out.slice(0, opts.limit ?? 100)
}

/** The next dated occurrence of one event on or after `from`, or null when it has finished. */
export function nextOccurrence<E extends EventLike>(event: E, from = new Date()): Occurrence<E> | null {
  return occurrences([event], { from, limit: 1 })[0] ?? null
}

/* ---------- the admin's picker ---------- */

export type Repeat = { freq: 'daily' | 'weekly' | 'biweekly' | 'monthly'; until?: Date | null }

/** The repeats the picker offers, in order. */
export const REPEAT_OPTIONS: { value: Repeat['freq']; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Every month' },
]

const FREQ = { daily: RRule.DAILY, weekly: RRule.WEEKLY, biweekly: RRule.WEEKLY, monthly: RRule.MONTHLY } as const

/** Picker → RRULE. Weekly rules repeat on the start date's weekday, which is what rrule does by default; `until` is the end of that calendar day. */
export function repeatToRule(r: Repeat | null): string | null {
  if (!r) return null
  const until = r.until ? new Date(Date.UTC(r.until.getUTCFullYear(), r.until.getUTCMonth(), r.until.getUTCDate(), 23, 59, 59)) : null
  return new RRule({ freq: FREQ[r.freq], ...(r.freq === 'biweekly' ? { interval: 2 } : {}), ...(until ? { until } : {}) }).toString().replace(/^RRULE:/, '')
}

/** RRULE → picker, or null for a rule the picker cannot express (BYDAY, COUNT, other intervals): the form then shows it as custom and leaves it alone. */
export function ruleToRepeat(rule: string | null | undefined): Repeat | null {
  if (!rule) return null
  let o: Partial<Options>
  try {
    o = RRule.parseString(rule)
  } catch {
    return null
  }
  if (Object.entries(o).some(([k, v]) => v !== undefined && v !== null && !['freq', 'interval', 'until'].includes(k))) return null
  const interval = o.interval ?? 1
  const freq = o.freq === RRule.DAILY && interval === 1 ? 'daily' : o.freq === RRule.MONTHLY && interval === 1 ? 'monthly' : o.freq === RRule.WEEKLY && interval === 2 ? 'biweekly' : o.freq === RRule.WEEKLY && interval === 1 ? 'weekly' : null
  if (!freq) return null
  return { freq, until: o.until && !Number.isNaN(o.until.getTime()) ? o.until : null }
}

/* ---------- iCalendar ---------- */

const toIcs = (d: Date, utc = true) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(/Z$/, utc ? 'Z' : '')

/** An iCalendar file for one occurrence, for "Add to calendar". Hand-rolled: escaping, CRLF, 75-octet folding. */
export function icsFor(o: { uid: string; title: string; startsAt: Date; endsAt: Date | null; location?: string | null; description?: string; url?: string; siteName: string }): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
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
