import { beforeAll, describe, expect, it } from 'vitest'
import { icsFor, nextOccurrence, occurrences, repeatToRule, ruleToRepeat } from '../src/content/events'
import { EMPTY_DOC } from '../src/richtext/types'
import { loginCookie, makeHandlers, testDb } from './helpers'

const day = 86_400_000
const ev = (slug: string, startsAt: Date, o: { endsAt?: Date | null; recurrence?: string | null } = {}) => ({ slug, startsAt, endsAt: o.endsAt ?? null, recurrence: o.recurrence ?? null })

describe('events — recurrence, sign-ups, calendar files', () => {
  it('expands a repeat rule into dated occurrences and keeps one-offs as they are', () => {
    const from = new Date('2026-09-01T00:00:00Z')
    const weekly = ev('open-play', new Date('2026-09-08T16:00:00Z'), { endsAt: new Date('2026-09-08T18:00:00Z'), recurrence: 'FREQ=WEEKLY' })
    const once = ev('gala', new Date('2026-09-20T01:00:00Z'))
    const past = ev('old', new Date('2026-08-01T01:00:00Z'))
    const out = occurrences([once, weekly, past], { from, to: new Date('2026-09-30T00:00:00Z') })
    expect(out.map((o) => o.key)).toEqual(['open-play@2026-09-08T16:00:00.000Z', 'open-play@2026-09-15T16:00:00.000Z', 'gala', 'open-play@2026-09-22T16:00:00.000Z', 'open-play@2026-09-29T16:00:00.000Z'])
    expect(out[0]!.endsAt?.toISOString()).toBe('2026-09-08T18:00:00.000Z')
    // an occurrence in progress still counts
    expect(occurrences([weekly], { from: new Date('2026-09-08T17:00:00Z'), to: new Date('2026-09-09T00:00:00Z') })).toHaveLength(1)
    expect(nextOccurrence(weekly, new Date('2026-09-16T00:00:00Z'))?.startsAt.toISOString()).toBe('2026-09-22T16:00:00.000Z')
    expect(nextOccurrence(ev('done', new Date('2026-01-01T00:00:00Z'), { recurrence: 'FREQ=WEEKLY;UNTIL=20260201T000000Z' }), from)).toBeNull()
    // a broken rule shows the first date rather than nothing
    expect(occurrences([ev('bad', new Date('2026-09-10T00:00:00Z'), { recurrence: 'FREQ=NOPE' })], { from }).map((o) => o.key)).toEqual(['bad'])
  })

  it('repeats keep their wall-clock time across daylight saving, in the event\'s zone', () => {
    // 10:00 in Denver: MDT (UTC-6) until 1 Nov 2026, MST (UTC-7) after
    const weekly = { ...ev('yoga', new Date('2026-10-20T16:00:00Z'), { endsAt: new Date('2026-10-20T17:00:00Z'), recurrence: 'FREQ=WEEKLY' }), timezone: 'America/Denver' }
    const out = occurrences([weekly], { from: new Date('2026-10-19T00:00:00Z'), to: new Date('2026-11-11T00:00:00Z') })
    expect(out.map((o) => o.startsAt.toISOString())).toEqual(['2026-10-20T16:00:00.000Z', '2026-10-27T16:00:00.000Z', '2026-11-03T17:00:00.000Z', '2026-11-10T17:00:00.000Z'])
    expect(out[3]!.endsAt?.toISOString()).toBe('2026-11-10T18:00:00.000Z')
    // "until 31 Dec" includes an evening occurrence on the 31st even though it is 1 Jan in UTC
    const thursdays = { ...ev('talk', new Date('2026-12-18T02:00:00Z'), { recurrence: 'FREQ=WEEKLY;UNTIL=20261231T235959Z' }), timezone: 'America/Denver' }
    expect(occurrences([thursdays], { from: new Date('2026-12-01T00:00:00Z') }).map((o) => o.startsAt.toISOString())).toEqual(['2026-12-18T02:00:00.000Z', '2026-12-25T02:00:00.000Z', '2027-01-01T02:00:00.000Z'])
    // an unknown zone falls back to UTC rather than throwing
    expect(occurrences([{ ...weekly, timezone: 'Mars/Olympus' }], { from: new Date('2026-10-19T00:00:00Z'), limit: 1 })).toHaveLength(1)
  })

  it('the admin picker round-trips through RRULE', () => {
    expect(repeatToRule({ freq: 'biweekly', until: new Date('2026-12-31T00:00:00Z') })).toBe('FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T235959Z')
    expect(repeatToRule({ freq: 'monthly' })).toBe('FREQ=MONTHLY')
    expect(repeatToRule(null)).toBeNull()
    expect(ruleToRepeat('FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T235959Z')).toEqual({ freq: 'biweekly', until: new Date('2026-12-31T23:59:59Z') })
    expect(ruleToRepeat('FREQ=WEEKLY')).toEqual({ freq: 'weekly', until: null })
    expect(ruleToRepeat('FREQ=WEEKLY;UNTIL=20261231')?.until?.toISOString()).toBe('2026-12-31T00:00:00.000Z') // date-only UNTIL (hand-written) does not crash the form
    expect(ruleToRepeat('')).toBeNull()
    // rules the picker cannot express are reported as such, not flattened into something else
    for (const custom of ['FREQ=WEEKLY;BYDAY=MO,WE', 'FREQ=WEEKLY;COUNT=3', 'FREQ=DAILY;INTERVAL=3', 'FREQ=NOPE']) expect(ruleToRepeat(custom), custom).toBeNull()
  })

  it('writes a valid iCalendar file: CRLF, escaping, folding, no split UTF-8', () => {
    const ics = icsFor({ uid: 'open-play@x', title: 'Open play; bring a paddle, or two', startsAt: new Date('2026-09-08T16:00:00Z'), endsAt: null, location: 'Town Park', description: 'Line one\nLine two — ' + 'é'.repeat(60), siteName: 'NF Pickle' })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics).toContain('SUMMARY:Open play\\; bring a paddle\\, or two')
    expect(ics).toContain('DTEND:20260908T170000Z') // one hour when no end
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two')
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
    expect(ics.replace(/\r\n /g, '')).toContain('é'.repeat(60))
  })

  it('a sign-up is a form submission that carries the event', async () => {
    const { db } = await testDb()
    const h = makeHandlers(db)
    const cookie = await loginCookie(db, h.env)
    const created = await h.call('POST', 'admin/events', { headers: { cookie }, body: { title: 'Clinic', slug: 'clinic', description: EMPTY_DOC, startsAt: new Date(Date.now() + day).toISOString(), timezone: 'UTC', status: 'published', registration: true, recurrence: 'FREQ=WEEKLY' } })
    expect(created.status).toBe(201)
    const id = (await created.json()).row.id as string
    const ok = await h.call('POST', 'forms/register', { body: { name: 'Pat', email: 'pat@example.org', guests: '2', eventId: id, eventTitle: 'Clinic', eventDate: 'Tue 8 Sep, 10am' } })
    expect(ok.status).toBe(200)
    const list = await (await h.call('GET', 'admin/submissions', { headers: { cookie } })).json()
    expect(list.rows[0].form).toBe('register')
    expect(list.rows[0].payload).toMatchObject({ name: 'Pat', guests: 2, eventTitle: 'Clinic' })
    expect(h.mailer.sent.at(-1)?.subject).toContain('register')
    expect((await h.call('POST', 'forms/register', { body: { name: 'Pat', email: 'pat@example.org', eventId: 'nope', eventTitle: 'x' } })).status).toBe(400)
    // the upcoming filter keeps recurring masters even when their first date has passed
    await h.call('PATCH', `admin/events/${id}`, { headers: { cookie }, body: { startsAt: new Date(Date.now() - 30 * day).toISOString() } })
    expect((await h.content.list('events', { filter: 'upcoming' })).map((e) => e.slug)).toEqual(['clinic'])
  })
})
