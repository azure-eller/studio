import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { reviveDates } from '../src/content/index'
import { EMPTY_DOC } from '../src/richtext/types'
import { loginCookie, makeHandlers, testDb } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
let h: ReturnType<typeof makeHandlers>
let cookie: string
beforeAll(async () => {
  ;({ db } = await testDb())
  h = makeHandlers(db)
  cookie = await loginCookie(db, h.env)
})
beforeEach(() => {
  h.cache.revalidated.length = 0
  h.cache.wraps.length = 0
})

describe('SPEC §4 — revalidation', () => {
  it('content reads declare their tags by convention: collection, collection:slug', async () => {
    await h.content.list('posts')
    expect(h.cache.wraps.at(-1)?.tags).toEqual(['posts'])
    await h.content.get('posts', 'hello')
    expect(h.cache.wraps.at(-1)?.tags).toEqual(['posts', 'posts:hello'])
    await h.content.list('events', { filter: 'upcoming' })
    expect(h.cache.wraps.at(-1)?.tags).toEqual(['events'])
    await h.content.list('media', { where: { collection: 'spring' } })
    expect(h.cache.wraps.at(-1)?.tags).toEqual(['media'])
  })

  it('admin writes revalidate collection + row tags, old and new slug on rename', async () => {
    const res = await h.call('POST', 'admin/posts', { headers: { cookie }, body: { slug: 'first', title: 'First', body: EMPTY_DOC, status: 'published' } })
    expect(res.status).toBe(201)
    expect(h.cache.revalidated).toEqual(['posts', 'posts:first'])
    const { row } = (await res.json()) as { row: { id: string } }

    h.cache.revalidated.length = 0
    const upd = await h.call('PATCH', `admin/posts/${row.id}`, { headers: { cookie }, body: { slug: 'renamed' } })
    expect(upd.status).toBe(200)
    expect(new Set(h.cache.revalidated)).toEqual(new Set(['posts', 'posts:first', 'posts:renamed']))

    h.cache.revalidated.length = 0
    const del = await h.call('DELETE', `admin/posts/${row.id}`, { headers: { cookie } })
    expect(del.status).toBe(200)
    expect(h.cache.revalidated).toEqual(['posts', 'posts:renamed'])
  })

  it('a media write revalidates the collections that embed media (covers), derived from foreign keys', async () => {
    const [m] = await db.insert((await import('../src/db/schema')).media).values({ key: 'sites/acme/c.png', filename: 'c.png', mime: 'image/png', sizeBytes: 1, alt: '' }).returning()
    h.cache.revalidated.length = 0
    await h.call('PATCH', `admin/media/${m!.id}`, { headers: { cookie }, body: { alt: 'A cover' } })
    expect(new Set(h.cache.revalidated)).toEqual(new Set(['media', 'posts', 'events', 'pages']))
    expect(h.collections.byName.media.dependents.sort()).toEqual(['events', 'pages', 'posts'])
    expect(h.collections.byName.posts.dependents).toEqual([])
  })

  it('public reads: only published rows past their date; upcoming events only; galleries by collection', async () => {
    await h.call('POST', 'admin/posts', { headers: { cookie }, body: { slug: 'draft', title: 'Draft', body: EMPTY_DOC } })
    await h.call('POST', 'admin/posts', { headers: { cookie }, body: { slug: 'later', title: 'Later', body: EMPTY_DOC, status: 'published', publishedAt: new Date(Date.now() + 86_400_000).toISOString() } })
    await h.call('POST', 'admin/posts', { headers: { cookie }, body: { slug: 'live', title: 'Live', body: EMPTY_DOC, status: 'published' } })
    const posts = await h.content.list('posts')
    expect(posts.map((p) => p.slug)).toEqual(['live'])
    expect((await h.content.get('posts', 'draft'))).toBeNull()
    expect((await h.content.get('posts', 'live'))?.title).toBe('Live')
    expect(posts[0]!.cover).toBeNull()

    const soon = new Date(Date.now() + 86_400_000).toISOString()
    const past = new Date(Date.now() - 86_400_000).toISOString()
    await h.call('POST', 'admin/events', { headers: { cookie }, body: { slug: 'soon', title: 'Soon', description: EMPTY_DOC, startsAt: soon, timezone: 'America/Denver', status: 'published' } })
    await h.call('POST', 'admin/events', { headers: { cookie }, body: { slug: 'gone', title: 'Gone', description: EMPTY_DOC, startsAt: past, timezone: 'America/Denver', status: 'published' } })
    expect((await h.content.list('events', { filter: 'upcoming' })).map((e) => e.slug)).toEqual(['soon'])
    expect((await h.content.list('events')).map((e) => e.slug).sort()).toEqual(['gone', 'soon'])
    expect(() => h.content.list('events', { filter: 'nope' })).toThrow(/no filter/)

    const gallery = await h.content.list('media', { where: { collection: 'spring' } })
    expect(gallery).toEqual([])
    expect(() => h.content.list('media', { where: { key: 'x' } })).toThrow(/Cannot filter/)
  })

  it('reads survive the JSON round-trip of a cache hit with Dates intact', async () => {
    const fresh = await h.content.get('events', 'soon')
    expect(fresh?.startsAt).toBeInstanceOf(Date)
    const hit = reviveDates(JSON.parse(JSON.stringify(fresh)) as typeof fresh)
    expect(hit?.startsAt).toBeInstanceOf(Date)
    expect(hit?.createdAt).toBeInstanceOf(Date)
    expect(hit?.endsAt).toBeNull()
    expect(hit?.title).toBe('Soon')
  })
})
