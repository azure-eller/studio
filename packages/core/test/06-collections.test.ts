import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultCollections, pickCollections } from '../src/collections/defaults'
import { defineCollections } from '../src/collections/define'
import { EMPTY_DOC } from '../src/richtext/types'

const all = defaultCollections({ timezone: 'America/Denver' })
const cols = defineCollections(all)

describe('SPEC §6 — collections', () => {
  it('derives field types from columns', () => {
    const p = cols.byName['posts']!.fields
    expect(p['slug']).toMatchObject({ type: 'slug', from: 'title', required: true })
    expect(p['title']).toMatchObject({ type: 'text', required: true, maxLength: 120 })
    expect(p['excerpt']).toMatchObject({ type: 'textarea', required: false })
    expect(p['body']).toMatchObject({ type: 'richtext', required: true })
    expect(p['coverMediaId']).toMatchObject({ type: 'image', required: false })
    expect(p['status']).toMatchObject({ type: 'select', required: false })
    expect(p['status']!.options?.map((o) => o.value)).toEqual(['draft', 'published'])
    expect(p['publishedAt']).toMatchObject({ type: 'datetime' })
    expect(Object.keys(p).indexOf('slug')).toBe(Object.keys(p).indexOf('title') + 1) // slug follows the field it derives from
    expect(p['coverMediaId']!.label).toBe('Cover image')
    expect(p['status']!.default).toBe('draft')
    expect(Object.keys(p)).not.toContain('id')
    expect(Object.keys(p)).not.toContain('createdAt')

    const e = cols.byName['events']!.fields
    expect(e['startsAt']).toMatchObject({ type: 'datetime', required: true })
    expect(e['timezone']).toMatchObject({ type: 'text', hidden: true, default: 'America/Denver' })
    expect(e['description']).toMatchObject({ type: 'richtext' })

    const m = cols.byName['media']!.fields
    expect(m['sort']).toMatchObject({ type: 'number' })
    expect(m['key']).toMatchObject({ hidden: true })
    expect(m['mime']).toMatchObject({ type: 'select', hidden: true })
  })

  it('derives validation once and shares it', () => {
    const s = cols.byName['posts']!.insertSchema
    expect(s.safeParse({ slug: 'ok-slug', title: 'T', body: EMPTY_DOC }).success).toBe(true)
    expect(s.safeParse({ slug: 'Not OK', title: 'T', body: EMPTY_DOC }).success).toBe(false)
    expect(s.safeParse({ slug: 'ok', body: EMPTY_DOC }).success).toBe(false) // title required
    expect(s.safeParse({ slug: 'ok', title: 'T', body: { type: 'doc', content: [{ type: 'codeBlock' }] } }).success).toBe(false)
    expect(s.safeParse({ slug: 'ok', title: 'x'.repeat(121), body: EMPTY_DOC }).success).toBe(false)
    expect(cols.byName['posts']!.updateSchema.safeParse({ title: 'only' }).success).toBe(true)
  })

  it('read-only collections and the fixed set', () => {
    expect(cols.byName['submissions']!.readOnly).toBe(true)
    expect(cols.byName['donations']!.readOnly).toBe(true)
    expect(Object.keys(all).sort()).toEqual(['donations', 'events', 'media', 'posts', 'submissions'])
    expect(Object.keys(pickCollections(all, ['posts', 'media']))).toEqual(['posts', 'media'])
    expect(() => pickCollections(all, ['pages'])).toThrow(/Unknown collection/)
  })

  it('collectionsMeta is JSON-serialisable and carries no tables or functions', () => {
    const json = JSON.parse(JSON.stringify(cols.meta)) as typeof cols.meta
    expect(json).toEqual(cols.meta)
    for (const m of json) {
      expect(Object.keys(m).sort()).toEqual(['fields', 'label', 'labelSingular', 'list', 'name', 'readOnly'])
    }
  })

  it('the admin handler has no per-collection branches', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/handlers/admin.ts'), 'utf8')
    for (const name of ['posts', 'events', 'media', 'submissions', 'donations']) {
      expect(src.includes(`'${name}'`), `admin.ts mentions '${name}'`).toBe(false)
    }
  })

  it('rejects overrides for unknown columns and unknown list columns', () => {
    expect(() => defineCollections({ x: { ...all['posts']!, list: { columns: ['nope'], sort: ['title', 'asc'] } } })).toThrow(/unknown column/)
  })
})
