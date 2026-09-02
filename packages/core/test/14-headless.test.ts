import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSite } from '../src/handlers/index'
import { defaultCollections } from '../src/collections/defaults'
import { defineCollections } from '../src/collections/define'
import { memoryMailer } from '../src/email/mailer'
import { loginCookie, testDb, testEnv } from './helpers'

/**
 * The backend is a library over Request/Response. This mounts it on a bare Node server with no framework and no
 * cache adapter, which is exactly what a future frontend on another runtime would do.
 */
let server: http.Server
let base: string
let cookie: string
beforeAll(async () => {
  const { db } = await testDb()
  const env = testEnv()
  const site = createSite({ db, env, collections: defineCollections(defaultCollections({ timezone: 'UTC' })), deps: { mailer: memoryMailer(), stripe: null } })
  cookie = await loginCookie(db, env)
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const request = new Request(url, { method: req.method ?? 'GET', headers: req.headers as Record<string, string>, ...(body ? { body } : {}) })
    const path = url.pathname.replace(/^\/api\/site\/?/, '').split('/').filter(Boolean)
    const response = await site.handle(request, path)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  })
  await new Promise<void>((r) => server.listen(0, r))
  base = `http://localhost:${(server.address() as { port: number }).port}/api/site`
})
afterAll(() => server.close())

describe('SPEC §1 — framework-free', () => {
  it('nothing outside the ./next entry imports from next', () => {
    const src = path.resolve(__dirname, '../src')
    const offenders: string[] = []
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(e.name) && p !== path.join(src, 'next.ts') && /from ['"]next(\/|['"])/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(src, p))
      }
    }
    walk(src)
    expect(offenders).toEqual([])
  })

  it('serves the API on a plain Node server', async () => {
    expect((await fetch(`${base}/auth/me`).then((r) => r.json()))).toEqual({ email: null })
    expect((await fetch(`${base}/admin/posts`)).status).toBe(401)
    const created = await fetch(`${base}/admin/posts`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Headless', slug: 'headless', body: { type: 'doc', content: [] }, status: 'published' }) })
    expect(created.status).toBe(201)
    const form = await fetch(`${base}/forms/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'A', email: 'a@example.org', message: 'hi' }) })
    expect(form.status).toBe(200)
    expect((await fetch(`${base}/nope`)).status).toBe(404)
  })
})
