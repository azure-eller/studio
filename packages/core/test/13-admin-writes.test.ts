import { beforeAll, describe, expect, it } from 'vitest'
import { media, posts } from '../src/db/schema'
import { loginCookie, makeHandlers, testDb } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
let h: ReturnType<typeof makeHandlers>
let cookie: string
beforeAll(async () => {
  ;({ db } = await testDb())
  h = makeHandlers(db)
  cookie = await loginCookie(db, h.env)
})
const post = (path: string, body: unknown) => h.call('POST', path, { headers: { cookie }, body })
const patch = (path: string, body: unknown) => h.call('PATCH', path, { headers: { cookie }, body })
const get = (path: string) => h.call('GET', path, { headers: { cookie } })
const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] }
const day = 86_400_000

describe('SPEC §6 — admin writes', () => {
  it('publish transitions: draft → publish → unpublish → publish again keeps the row visible; scheduled → publish now resets the date', async () => {
    const created = await post('admin/posts', { title: 'One', slug: 'one', body: doc })
    expect(created.status).toBe(201)
    const id = (await created.json()).row.id as string
    let row = (await (await patch(`admin/posts/${id}`, { status: 'published', publishedAt: null })).json()).row
    expect(row.status).toBe('published')
    const first = new Date(row.publishedAt as string).getTime()
    expect(first).toBeGreaterThan(0)

    row = (await (await patch(`admin/posts/${id}`, { status: 'draft' })).json()).row
    row = (await (await patch(`admin/posts/${id}`, { status: 'published', publishedAt: null })).json()).row
    expect(row.status).toBe('published')
    expect(row.publishedAt, 'republish must not leave the row invisible').not.toBeNull()

    const future = new Date(Date.now() + 7 * day).toISOString()
    row = (await (await patch(`admin/posts/${id}`, { status: 'published', publishedAt: future })).json()).row
    expect(new Date(row.publishedAt as string).getTime()).toBeGreaterThan(Date.now() + 6 * day)
    row = (await (await patch(`admin/posts/${id}`, { status: 'published', publishedAt: null })).json()).row
    expect(new Date(row.publishedAt as string).getTime()).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('creating as published stamps the date; a draft has none', async () => {
    const pub = (await (await post('admin/posts', { title: 'Two', slug: 'two', body: doc, status: 'published' })).json()).row
    expect(pub.publishedAt).not.toBeNull()
    const draft = (await (await post('admin/posts', { title: 'Three', slug: 'three', body: doc })).json()).row
    expect(draft.status).toBe('draft')
    expect(draft.publishedAt).toBeNull()
  })

  it('constraint errors are 4xx with the field named, not 500s', async () => {
    const dup = await post('admin/posts', { title: 'One again', slug: 'one', body: doc })
    expect(dup.status).toBe(400)
    expect((await dup.json()).issues[0].path).toEqual(['slug'])
    const bogus = await post('admin/posts', { title: 'x', slug: 'x-status', body: doc, status: 'bogus' })
    expect(bogus.status).toBe(400)
    expect((await get('admin/posts/not-a-uuid')).status).toBe(404)
    expect((await patch('admin/posts/not-a-uuid', { title: 'x' })).status).toBe(404)
    expect((await h.call('POST', 'admin/posts', { headers: { cookie }, raw: 'null' })).status).toBe(400)
    expect((await h.call('POST', 'admin/posts', { headers: { cookie }, raw: '[1]' })).status).toBe(400)
  })

  it('hidden media columns cannot be written through the generic API; media rows come only from presign', async () => {
    const [m] = await db.insert(media).values({ key: 'sites/acme/a.png', filename: 'a.png', mime: 'image/png', sizeBytes: 1, alt: '' }).returning()
    // Hidden fields are dropped from the write, like any unknown key; the visible ones still apply.
    const res = await patch(`admin/media/${m!.id}`, { key: 'sites/other/x.png', mime: 'image/svg+xml', confirmedAt: new Date().toISOString(), alt: 'A description' })
    expect(res.status).toBe(200)
    expect((await db.select().from(media))[0]).toMatchObject({ key: 'sites/acme/a.png', mime: 'image/png', confirmedAt: null, alt: 'A description' })
    const created = await post('admin/media', { key: '//evil.example/x.png', filename: 'x', mime: 'image/png', sizeBytes: 1, alt: 'x' })
    expect(created.status).toBe(400)
    expect((await created.json()).issues[0].path).toEqual(['key'])
    expect(await db.select().from(media)).toHaveLength(1)
  })

  it('read-only collections refuse writes; inbox lists count and filter unread; opening marks read', async () => {
    expect((await post('admin/submissions', { form: 'contact', payload: {} })).status).toBe(405)
    await h.call('POST', 'forms/contact', { body: { name: 'Pat', email: 'pat@example.org', message: 'Hello' } })
    await h.call('POST', 'forms/contact', { body: { name: 'Sam', email: 'sam@example.org', message: 'Hi' } })
    const list = await (await get('admin/submissions')).json()
    expect(list.total).toBe(2)
    expect(list.unread).toBe(2)
    const id = list.rows[0].id as string
    expect((await post(`admin/submissions/${id}/read`, undefined)).status).toBe(200)
    const after = await (await get('admin/submissions?unread=1')).json()
    expect(after.rows).toHaveLength(1)
    expect(after.unread).toBe(1)
    expect((await get('admin/posts')).status).toBe(200)
    expect('unread' in (await (await get('admin/posts')).json())).toBe(false)
    expect((await get('admin/posts?sort=body')).status).toBe(400)
  })

  it('deleting revalidates and the row is gone', async () => {
    const rows = await db.select().from(posts)
    const del = await h.call('DELETE', `admin/posts/${rows[0]!.id}`, { headers: { cookie } })
    expect(del.status).toBe(200)
    expect((await get(`admin/posts/${rows[0]!.id}`)).status).toBe(404)
  })
})
