import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { media } from '../src/db/schema'
import { isKeyInPrefix, objectKey, safeFilename } from '../src/storage/r2'
import { loginCookie, makeHandlers, testDb } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
let h: ReturnType<typeof makeHandlers>
let cookie: string
beforeAll(async () => {
  ;({ db } = await testDb())
  h = makeHandlers(db)
  cookie = await loginCookie(db, h.env)
})

describe('SPEC §1.2 — presign', () => {
  it('requires an admin session', async () => {
    expect((await h.call('POST', 'presign', { body: { filename: 'a.png', mime: 'image/png', sizeBytes: 1, width: 1, height: 1 } })).status).toBe(401)
  })

  it('rejects disallowed mime, oversize, and images without dimensions', async () => {
    const post = (body: unknown) => h.call('POST', 'presign', { headers: { cookie }, body })
    expect((await post({ filename: 'a.exe', mime: 'application/x-msdownload', sizeBytes: 1 })).status).toBe(400)
    expect((await post({ filename: 'a.png', mime: 'image/png', sizeBytes: 26 * 1024 * 1024, width: 1, height: 1 })).status).toBe(400)
    expect((await post({ filename: 'a.png', mime: 'image/png', sizeBytes: 10 })).status).toBe(400)
    expect((await post({ filename: 'a.png', mime: 'image/png', sizeBytes: 10, width: 1, height: 1, collection: 'Bad Name' })).status).toBe(400)
  })

  it('creates the row under the site prefix and confirms the upload', async () => {
    const res = await h.call('POST', 'presign', { headers: { cookie }, body: { filename: 'My Photo (1).JPG', mime: 'image/jpeg', sizeBytes: 1234, width: 800, height: 600, collection: 'spring' } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { uploadUrl: string; key: string; mediaId: string; publicUrl: string }
    expect(body.key).toMatch(/^sites\/acme\/[0-9a-f-]{36}-my-photo-1\.jpg$/)
    expect(body.uploadUrl).toContain('acct.r2.cloudflarestorage.com/studio-media/')
    expect(body.uploadUrl).toContain('X-Amz-Signature=')
    expect(body.publicUrl).toBe(`https://media.studio.test/${body.key}`)

    const [row] = await db.select().from(media).where(eq(media.id, body.mediaId))
    expect(row).toMatchObject({ width: 800, height: 600, mime: 'image/jpeg', collection: 'spring', confirmedAt: null })

    const confirm = await h.call('POST', 'presign/confirm', { headers: { cookie }, body: { mediaId: body.mediaId } })
    expect(confirm.status).toBe(200)
    const [after] = await db.select().from(media).where(eq(media.id, body.mediaId))
    expect(after!.confirmedAt).toBeInstanceOf(Date)
    expect((await h.call('POST', 'presign/confirm', { headers: { cookie }, body: { mediaId: '00000000-0000-4000-8000-000000000000' } })).status).toBe(404)
  })

  it('keys are safe and stay inside the prefix', () => {
    expect(safeFilename('../../etc/passwd')).toBe('passwd')
    expect(safeFilename('Ünïcode name!!.PNG')).toMatch(/^[a-z0-9._-]+$/)
    expect(objectKey('sites/acme', 'x.png')).toMatch(/^sites\/acme\/[0-9a-f-]{36}-x\.png$/)
    expect(isKeyInPrefix('sites/acme/a.png', 'sites/acme')).toBe(true)
    expect(isKeyInPrefix('sites/other/a.png', 'sites/acme')).toBe(false)
    expect(isKeyInPrefix('sites/acme/../other/a.png', 'sites/acme')).toBe(false)
  })
})
