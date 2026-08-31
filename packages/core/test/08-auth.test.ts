import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { sessions } from '../src/db/schema'
import { loginCookie, makeHandlers, testDb } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
let h: ReturnType<typeof makeHandlers>
beforeAll(async () => {
  ;({ db } = await testDb())
  h = makeHandlers(db)
})

const tokenFrom = (text: string) => /token=([0-9a-f]{64})/.exec(text)?.[1] ?? ''

describe('SPEC §2 auth + §1.2 routes — magic link and sessions', () => {
  it('emails a link to an admin, says nothing to strangers, and the link works once', async () => {
    const stranger = await h.call('POST', 'auth/request', { body: { email: 'nobody@example.org' }, headers: { 'x-forwarded-for': '1.1.1.1' } })
    expect(stranger.status).toBe(200)
    expect(h.mailer.sent).toHaveLength(0)

    const res = await h.call('POST', 'auth/request', { body: { email: 'Admin@Example.org' }, headers: { 'x-forwarded-for': '1.1.1.2' } })
    expect(res.status).toBe(200)
    expect(h.mailer.sent).toHaveLength(1)
    const mail = h.mailer.sent[0]!
    expect(mail.to).toBe('admin@example.org')
    expect(mail.text).toContain('https://acme.studio.test/api/site/auth/verify?token=')
    const token = tokenFrom(mail.text ?? '')
    expect(token).toHaveLength(64)

    const verify = await h.call('GET', `auth/verify?token=${token}`)
    expect(verify.status).toBe(303)
    expect(verify.headers.get('location')).toBe('/admin')
    const setCookie = verify.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/^studio_session=.+; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=\d+$/)
    const cookie = setCookie.split(';')[0]!

    const me = await h.call('GET', 'auth/me', { headers: { cookie } })
    expect(me.status).toBe(200)
    expect(await me.json()).toEqual({ email: 'admin@example.org' })

    const again = await h.call('GET', `auth/verify?token=${token}`)
    expect(again.headers.get('location')).toBe('/admin?error=invalid_link')

    const logout = await h.call('POST', 'auth/logout', { headers: { cookie } })
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(await (await h.call('GET', 'auth/me', { headers: { cookie } })).json()).toEqual({ email: null })
  })

  it('rejects expired links', async () => {
    const late = makeHandlers(db, { deps: { now: () => new Date(Date.now() + 16 * 60 * 1000) } })
    await h.call('POST', 'auth/request', { body: { email: 'second@example.org' }, headers: { 'x-forwarded-for': '1.1.1.3' } })
    const token = tokenFrom(h.mailer.sent.at(-1)?.text ?? '')
    const res = await late.call('GET', `auth/verify?token=${token}`)
    expect(res.headers.get('location')).toBe('/admin?error=invalid_link')
  })

  it('rate-limits per email and per IP', async () => {
    const codes: number[] = []
    for (let i = 0; i < 6; i++) codes.push((await h.call('POST', 'auth/request', { body: { email: 'limited@example.org' }, headers: { 'x-forwarded-for': `9.9.9.${i}` } })).status)
    expect(codes).toEqual([200, 200, 200, 200, 200, 429])
    const ipCodes: number[] = []
    for (let i = 0; i < 21; i++) ipCodes.push((await h.call('POST', 'auth/request', { body: { email: `u${i}@example.org` }, headers: { 'x-forwarded-for': '7.7.7.7' } })).status)
    expect(ipCodes.slice(0, 20).every((c) => c === 200)).toBe(true)
    expect(ipCodes[20]).toBe(429)
  })

  it('a tampered cookie fails and deleting the session row revokes it', async () => {
    const cookie = await loginCookie(db, h.env)
    expect((await h.call('GET', 'auth/me', { headers: { cookie } })).status).toBe(200)
    const me = async (hh: typeof h, c: string) => (await (await hh.call('GET', 'auth/me', { headers: { cookie: c } })).json()) as { email: string | null }
    const tampered = cookie.slice(0, -2) + 'xx'
    expect((await me(h, tampered)).email).toBeNull()
    const other = await makeHandlers(db, { env: { ...h.env, AUTH_SECRET: 'another-secret-another-secret-another-secret' } })
    expect((await me(other, cookie)).email).toBeNull()
    await db.delete(sessions).where(eq(sessions.email, 'admin@example.org'))
    expect((await me(h, cookie)).email).toBeNull()
  })
})
