import { describe, expect, it } from 'vitest'
import { defaultCollections } from '../src/collections/defaults'
import { defineCollections } from '../src/collections/define'
import { duplicateBody, formBody, saveOutcome, slugify } from '../src/admin/form'
import type { Field } from '../src/collections/types'

const { meta } = defineCollections(defaultCollections({ timezone: 'America/Denver' }))
const by = (name: string) => meta.find((m) => m.name === name)!
const posts = by('posts')
const fields = Object.entries(posts.fields).filter(([, f]) => !f.hidden) as [string, Field][]
const now = new Date('2026-09-03T12:00:00Z')

describe('the record form\'s rules', () => {
  it('tells the user what a save did, from before and after', () => {
    const draft = { status: 'draft' }
    const live = { status: 'published', publishedAt: '2026-09-01T00:00:00Z' }
    expect(saveOutcome(posts, draft, live, now)).toBe('published')
    expect(saveOutcome(posts, live, draft, now)).toBe('unpublished')
    expect(saveOutcome(posts, draft, draft, now)).toBe('draft')
    expect(saveOutcome(posts, live, live, now)).toBe('saved')
    expect(saveOutcome(posts, draft, { status: 'published', publishedAt: '2026-10-01T00:00:00Z' }, now)).toBe('scheduled')
    expect(saveOutcome(by('media'), {}, { alt: 'x' }, now)).toBe('saved')
  })

  it('sends visible fields only, nulls emptied non-text controls, and fills defaults on create', () => {
    const row = { title: 'Hi', slug: 'hi', excerpt: '', coverMediaId: '', publishedAt: '', category: '' }
    const created = formBody(fields, row, { creating: true })
    expect(created['excerpt']).toBe('') // text stays text
    expect(created['coverMediaId']).toBeNull()
    expect(created['publishedAt']).toBeNull()
    expect(created['status']).toBe('draft') // the declared default
    expect('id' in created).toBe(false)
    const published = formBody(fields, { ...row, status: 'draft', publishedAt: '2026-10-01T00:00:00Z' }, { creating: false, status: 'published', clearPublishedAt: true })
    expect(published['status']).toBe('published')
    expect(published['publishedAt']).toBeNull() // "publish now" drops the scheduled date
    const untouched = formBody(fields, { title: 'x' }, { creating: false })
    expect(untouched['status']).toBeUndefined() // no default on edit: the server keeps what it has
  })

  it('duplicates as a fresh draft with a renamed title and slug', () => {
    const copy = duplicateBody(posts, fields, { id: '1', title: 'Soup', slug: 'soup', status: 'published', publishedAt: '2026-09-01T00:00:00Z', coverMediaId: null }, 'ab12')
    expect(copy).toMatchObject({ title: 'Soup (copy)', slug: 'soup-copy-ab12', status: 'draft', publishedAt: null })
    expect('id' in copy).toBe(false)
    expect('coverMediaId' in copy).toBe(false)
  })

  it('slugs are lowercase ascii, hyphenated, capped', () => {
    expect(slugify('  Crème Brûlée & Co. ')).toBe('creme-brulee-co')
    expect(slugify('x'.repeat(100))).toHaveLength(80)
  })
})
