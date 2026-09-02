import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSession, signSessionToken } from '../src/auth/session'
import { defaultCollections } from '../src/collections/defaults'
import { defineCollections } from '../src/collections/define'
import type { Db } from '../src/db/client'
import * as schema from '../src/db/schema'
import { memoryMailer } from '../src/email/mailer'
import { parseEnv, type Env } from '../src/env'
import { recordingCache } from '../src/cache'
import { createSite } from '../src/handlers/index'
import type { HandlerDeps } from '../src/handlers/context'
import { TEST_ENV } from './setup'

export const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations')

export async function testDb(): Promise<{ db: Db; client: PGlite }> {
  const client = new PGlite()
  const db = drizzle(client, { schema }) as unknown as Db
  await migrate(db, { migrationsFolder: MIGRATIONS })
  return { db, client }
}

export function testEnv(overrides: Record<string, string | undefined> = {}): Env {
  return parseEnv({ ...TEST_ENV, ...overrides })
}

export function makeHandlers(db: Db, opts: { env?: Env; deps?: HandlerDeps } = {}) {
  const env = opts.env ?? testEnv()
  const mailer = memoryMailer()
  const collections = defineCollections(defaultCollections({ timezone: 'America/Denver' }))
  const cache = recordingCache()
  const site = createSite({ db, env, collections, cache, deps: { mailer, stripe: null, ...opts.deps } })
  const { handlers } = site
  const call = (method: string, path: string, init: { body?: unknown; headers?: Record<string, string>; raw?: string } = {}) => {
    const url = `https://acme.studio.test/api/site/${path}`
    const headers: Record<string, string> = { ...init.headers }
    let body: string | undefined
    if (init.raw !== undefined) body = init.raw
    else if (init.body !== undefined) {
      body = JSON.stringify(init.body)
      headers['content-type'] = 'application/json'
    }
    const req = new Request(url, body === undefined ? { method, headers } : { method, headers, body })
    const segs = path.split('?')[0]!.split('/').filter(Boolean)
    const h = handlers[method as keyof typeof handlers] ?? handlers.GET
    return h(req, { params: Promise.resolve({ path: segs }) })
  }
  return { site, handlers, call, mailer, env, collections, cache, content: site.content }
}

export async function loginCookie(db: Db, env: Env, email = 'admin@example.org'): Promise<string> {
  const sid = await createSession(db, email)
  const jwt = await signSessionToken(env.AUTH_SECRET, sid)
  return `studio_session=${jwt}`
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
