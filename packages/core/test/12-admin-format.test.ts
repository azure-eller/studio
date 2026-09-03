import { describe, expect, it } from 'vitest'
import { defaultCollections } from '../src/collections/defaults'
import { defineCollections } from '../src/collections/define'
import { detailsOf, fmtDate, formatCell, labelFor, previewOf, publishState, repeatLabel, rowUrl, titleOf } from '../src/admin/format'

const { meta } = defineCollections(defaultCollections({ timezone: 'America/Denver' }))
const by = (name: string) => meta.find((m) => m.name === name)!

describe('admin display helpers', () => {
  it('dates read like a person wrote them', () => {
    const now = new Date('2026-09-02T18:00:00')
    expect(fmtDate(new Date('2026-09-02T09:05:00'), {}, now)).toMatch(/^Today, 9:05/)
    expect(fmtDate(new Date('2026-09-01T21:30:00'), { time: false }, now)).toBe('Yesterday')
    expect(fmtDate(new Date('2026-03-04T10:00:00'), { time: false }, now)).toBe('Mar 4')
    expect(fmtDate(new Date('2025-03-04T10:00:00'), {}, now)).toBe('Mar 4, 2025')
    expect(fmtDate('not a date')).toBe('not a date')
  })

  it('system columns get plain labels; configured labels win', () => {
    expect(labelFor(by('submissions'), 'createdAt')).toBe('Created')
    expect(labelFor(by('submissions'), 'payload')).toBe('Message')
    expect(labelFor(by('media'), 'alt')).toBe('Description')
    expect(labelFor(by('donations'), 'amountCents')).toBe('Amount')
  })

  it('a form submission reads as who wrote it and what they said', () => {
    const row = { payload: { name: 'Pat', email: 'pat@example.org', message: 'Do you build sites for farms?  Ours is small.' }, email: 'pat@example.org' }
    expect(titleOf(row, by('submissions'))).toBe('Pat')
    expect(previewOf(row)).toBe('Do you build sites for farms? Ours is small.')
    expect(formatCell(undefined, 'payload', row.payload, 30)).toBe('Pat · pat@example.org · Do…')
    expect(formatCell(by('donations').fields['amountCents'], 'amountCents', 2500)).toBe('$25.00')
    expect(formatCell(by('donations').fields['amountCents'], 'amountCents', 2500, 90, { currency: 'eur' })).toMatch(/25\.00/)
  })

  it('public URLs only for published rows of collections that declare a path', () => {
    const posts = by('posts')
    expect(rowUrl(posts, { slug: 'hello', status: 'published' }, 'https://x.test/')).toBe('https://x.test/posts/hello')
    expect(rowUrl(posts, { slug: 'hello', status: 'draft' }, 'https://x.test')).toBeNull()
    expect(rowUrl(posts, { slug: '', status: 'published' }, 'https://x.test')).toBeNull()
    expect(rowUrl(by('media'), { id: '1' }, 'https://x.test')).toBeNull()
    expect(by('media').view).toBe('grid')
  })

  it('publish state is one word, and repeat rules read as a sentence', () => {
    const now = new Date('2026-09-03T12:00:00Z')
    expect(publishState(by('posts'), { status: 'draft' }, now)).toBe('draft')
    expect(publishState(by('posts'), { status: 'published', publishedAt: '2026-09-01T00:00:00Z' }, now)).toBe('published')
    expect(publishState(by('posts'), { status: 'published', publishedAt: '2026-10-01T00:00:00Z' }, now)).toBe('scheduled')
    expect(publishState(by('posts'), {}, now)).toBe('draft')
    expect(publishState(by('media'), { alt: '' }, now)).toBeNull()
    expect(repeatLabel(null)).toBe('Does not repeat')
    expect(repeatLabel('FREQ=WEEKLY;INTERVAL=2')).toBe('Every two weeks')
    expect(repeatLabel('FREQ=WEEKLY;UNTIL=20261231T235959Z')).toMatch(/^Every week until Dec 31/)
    expect(repeatLabel('FREQ=WEEKLY;BYDAY=MO,WE')).toBe('Custom repeat')
    expect(formatCell(by('events').fields['recurrence'], 'recurrence', 'FREQ=MONTHLY')).toBe('Every month')
  })

  it('a message reads as who, their email, the body, and the rest as details', () => {
    const row = { id: '1', createdAt: '2026-09-01T10:00:00Z', form: 'register', email: 'pat@example.org', payload: { name: 'Pat', email: 'pat@example.org', guests: 2, note: 'We will bring the kids and a picnic blanket.', eventTitle: 'Open play' }, readAt: null }
    const d = detailsOf(by('submissions'), row)
    expect(d.name).toBe('Pat')
    expect(d.email).toBe('pat@example.org')
    expect(d.form).toBe('Register')
    expect(d.body).toEqual({ label: 'Note', text: 'We will bring the kids and a picnic blanket.' })
    expect(d.details.map((x) => x.label)).toEqual(['Guests', 'Event Title']) // a number (guests) is a detail too
    const donation = detailsOf(by('donations'), { id: '2', createdAt: '2026-09-01T10:00:00Z', donorName: 'Sam', donorEmail: 'sam@example.org', amountCents: 2500, currency: 'usd', status: 'paid' })
    expect(donation.name).toBe('Sam')
    expect(donation.email).toBe('sam@example.org')
    expect(donation.body).toBeNull()
    expect(donation.details.find((x) => x.label === 'Amount')?.text).toBe('$25.00')
  })
})
