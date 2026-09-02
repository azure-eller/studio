import { describe, expect, it } from 'vitest'
import { defaultCollections } from '../src/collections/defaults'
import { defineCollections } from '../src/collections/define'
import { fmtDate, formatCell, labelFor, previewOf, rowUrl, titleOf } from '../src/admin/format'

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
})
