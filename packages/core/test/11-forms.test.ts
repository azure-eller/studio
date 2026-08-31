import { beforeAll, describe, expect, it } from 'vitest'
import { submissions } from '../src/db/schema'
import { makeHandlers, testDb } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
let h: ReturnType<typeof makeHandlers>
beforeAll(async () => {
  ;({ db } = await testDb())
  h = makeHandlers(db)
})

describe('SPEC §2.2 — public forms', () => {
  it('stores a valid contact submission and notifies the client', async () => {
    const res = await h.call('POST', 'forms/contact', { body: { name: 'Pat', email: 'Pat@Example.org', message: 'Hello!', website: '' }, headers: { 'x-forwarded-for': '5.5.5.1' } })
    expect(res.status).toBe(200)
    const rows = await db.select().from(submissions)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ form: 'contact', email: 'pat@example.org' })
    expect(rows[0]!.payload).toEqual({ name: 'Pat', email: 'Pat@Example.org', message: 'Hello!' })
    const mail = h.mailer.sent.at(-1)!
    expect(mail.to).toBe('client@example.org')
    expect(mail.replyTo).toBe('pat@example.org')
    expect(mail.subject).toContain('contact')
  })

  it('validates per form and rejects unknown forms', async () => {
    expect((await h.call('POST', 'forms/contact', { body: { name: 'x' }, headers: { 'x-forwarded-for': '5.5.5.2' } })).status).toBe(400)
    expect((await h.call('POST', 'forms/newsletter', { body: { email: 'not-an-email' }, headers: { 'x-forwarded-for': '5.5.5.2' } })).status).toBe(400)
    expect((await h.call('POST', 'forms/newsletter', { body: { email: 'n@example.org' }, headers: { 'x-forwarded-for': '5.5.5.2' } })).status).toBe(200)
    expect((await h.call('POST', 'forms/volunteer', { body: { name: 'V', email: 'v@example.org', interests: 'kids' }, headers: { 'x-forwarded-for': '5.5.5.2' } })).status).toBe(200)
    expect((await h.call('POST', 'forms/signup', { body: { email: 'n@example.org' } })).status).toBe(404)
  })

  it('honeypot submissions succeed silently and store nothing', async () => {
    const before = (await db.select().from(submissions)).length
    const res = await h.call('POST', 'forms/contact', { body: { name: 'Bot', email: 'b@example.org', message: 'buy', website: 'http://spam' }, headers: { 'x-forwarded-for': '5.5.5.3' } })
    expect(res.status).toBe(200)
    expect((await db.select().from(submissions)).length).toBe(before)
  })

  it('rate-limits per IP', async () => {
    const codes: number[] = []
    for (let i = 0; i < 11; i++) codes.push((await h.call('POST', 'forms/newsletter', { body: { email: `r${i}@example.org` }, headers: { 'x-forwarded-for': '5.5.5.9' } })).status)
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true)
    expect(codes[10]).toBe(429)
  })
})
