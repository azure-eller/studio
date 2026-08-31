import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { content, reviveDates } from '../src/content/index'
import { EMPTY_DOC } from '../src/richtext/types'
import { loginCookie, makeHandlers, testDb } from './helpers'
import { cacheCalls, revalidated } from './setup'

let db: Awaited<ReturnType<typeof testDb>>['db']
let h: ReturnType<typeof makeHandlers>
let cookie: string
beforeAll(async () => {
  ;({ db } = await testDb())
  h = makeHandlers(db)
  cookie = await loginCookie(db, h.env)
})
beforeEach(() => {
  revalidated.length = 0
  cacheCalls.length = 0
})

describe('SPEC §4 — revalidation', () => {
  it('content reads declare their tags', async () => {
    await content.getPosts(db)
    expect(cacheCalls.at(-1)?.tags).toEqual(['posts'])
    await content.getPost(db, 'hello')
    expect(cacheCalls.at(-1)?.tags).toEqual(['posts', 'post:hello'])
    await content.getEvents(db)
    expect(cacheCalls.at(-1)?.tags).toEqual(['events'])
    await content.getEvent(db, 'picnic')
    expect(cacheCalls.at(-1)?.tags).toEqual(['events', 'event:picnic'])
    await content.getGallery(db, 'spring')
    expect(cacheCalls.at(-1)?.tags).toEqual(['media:spring'])
  })

  it('admin writes revalidate collection + row tags, old and new slug on rename', async () => {
    const res = await h.call('POST', 'admin/posts', { headers: { cookie }, body: { slug: 'first', title: 'First', body: EMPTY_DOC, status: 'published' } })
    expect(res.status).toBe(201)
    expect(revalidated).toEqual(['posts', 'post:first'])
    const { row } = (await res.json()) as { row: { id: string } }

    revalidated.length = 0
    const upd = await h.call('PATCH', `admin/posts/${row.id}`, { headers: { cookie }, body: { slug: 'renamed' } })
    expect(upd.status).toBe(200)
    expect(new Set(revalidated)).toEqual(new Set(['posts', 'post:first', 'post:renamed']))

    revalidated.length = 0
    const del = await h.call('DELETE', `admin/posts/${row.id}`, { headers: { cookie } })
    expect(del.status).toBe(200)
    expect(revalidated).toEqual(['posts', 'post:renamed'])
  })

  it('reads survive the JSON round-trip of a cache hit with Dates intact', async () => {
    await h.call('POST', 'admin/events', { headers: { cookie }, body: { slug: 'picnic', title: 'Picnic', description: EMPTY_DOC, startsAt: new Date(Date.now() + 86_400_000).toISOString(), timezone: 'America/Denver', status: 'published' } })
    const fresh = await content.getEvent(db, 'picnic')
    expect(fresh?.startsAt).toBeInstanceOf(Date)
    // simulate a data-cache hit: whatever unstable_cache stored comes back as parsed JSON
    const hit = reviveDates(JSON.parse(JSON.stringify(fresh)) as typeof fresh)
    expect(hit?.startsAt).toBeInstanceOf(Date)
    expect(hit?.createdAt).toBeInstanceOf(Date)
    expect(hit?.endsAt).toBeNull()
    expect(hit?.title).toBe('Picnic')
    expect(reviveDates({ note: '2026-01-01T00:00:00Z' })).toEqual({ note: '2026-01-01T00:00:00Z' })
  })

  it('gallery tag is revalidated when a file is confirmed into a collection', async () => {
    const pre = await h.call('POST', 'presign', { headers: { cookie }, body: { filename: 'a.png', mime: 'image/png', sizeBytes: 10, width: 4, height: 4, collection: 'spring' } })
    const { mediaId } = (await pre.json()) as { mediaId: string }
    revalidated.length = 0
    await h.call('POST', 'presign/confirm', { headers: { cookie }, body: { mediaId } })
    expect(revalidated).toEqual(['media:spring'])
  })
})
