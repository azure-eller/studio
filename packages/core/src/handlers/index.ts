import Stripe from 'stripe'
import { noCache, type Cache } from '../cache'
import type { CollectionMap, Collections } from '../collections/types'
import { createContent, type Content } from '../content/index'
import type { Db } from '../db/client'
import { resendMailer } from '../email/mailer'
import type { Env } from '../env'
import { r2Client } from '../storage/r2'
import { adminCreate, adminDelete, adminGet, adminList, adminMarkRead, adminUpdate } from './admin'
import { authLogout, authMe, authRequest, authVerify } from './auth'
import type { Ctx, HandlerDeps } from './context'
import { submitForm } from './forms'
import { HttpError, json, pgErrorToHttp } from './http'
import { presign, presignConfirm } from './presign'
import { stripeCheckout, stripeWebhook } from './stripe'

export type RouteContext = { params: Promise<{ path?: string[] }> | { path?: string[] } }
export type RouteHandler = (req: Request, ctx: RouteContext) => Promise<Response>

/** Next.js App Router handlers for `app/api/site/[...path]/route.ts`. */
export interface SiteHandlers {
  GET: RouteHandler
  POST: RouteHandler
  PATCH: RouteHandler
  DELETE: RouteHandler
}

export interface Site<M extends CollectionMap> {
  /** Framework-free: mount on anything that speaks `Request`/`Response`. `path` is the segments after the mount point. */
  handle(req: Request, path: string[]): Promise<Response>
  handlers: SiteHandlers
  content: Content<M>
  collections: Collections<M>
}

/**
 * SPEC §1 — the whole backend for one site. `handle` (or `handlers`) is the API, `content` is what pages read,
 * `collections` is what the admin renders. A frontend needs nothing else.
 */
export function createSite<M extends CollectionMap>(opts: { db: Db; env: Env; collections: Collections<M>; cache?: Cache; deps?: HandlerDeps }): Site<M> {
  const { db, env, collections, deps = {} } = opts
  const cache = opts.cache ?? noCache
  const ctx: Ctx = {
    db,
    env,
    collections,
    cache,
    mailer: deps.mailer ?? resendMailer(env.RESEND_API_KEY),
    stripe: deps.stripe !== undefined ? deps.stripe : env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null,
    s3: deps.s3 ?? r2Client(env),
    now: deps.now ?? (() => new Date()),
    siteName: deps.siteName ?? new URL(env.NEXT_PUBLIC_SITE_URL).hostname,
  }

  const handle = async (req: Request, path: string[]): Promise<Response> => {
    try {
      return await route(req, ctx, path)
    } catch (e) {
      const err = e instanceof HttpError ? e : pgErrorToHttp(e)
      if (err) return json(err.status, { error: err.message, ...(err.issues ? { issues: err.issues } : {}) })
      console.error('[studio-core]', e)
      return json(500, { error: 'internal_error' })
    }
  }
  const next: RouteHandler = async (req, routeCtx) => handle(req, (await routeCtx.params).path ?? [])
  return {
    handle,
    handlers: { GET: next, POST: next, PATCH: next, DELETE: next },
    content: createContent(db, collections, cache, env.NEXT_PUBLIC_MEDIA_BASE_URL),
    collections,
  }
}

async function route(req: Request, ctx: Ctx, path: string[]): Promise<Response> {
  const m = req.method
  const [a, b, c] = path
  const is = (method: string, ...segs: string[]) => m === method && segs.length === path.length && segs.every((s, i) => s === path[i])

  if (is('POST', 'auth', 'request')) return authRequest(req, ctx, path)
  if (is('GET', 'auth', 'verify')) return authVerify(req, ctx)
  if (is('POST', 'auth', 'logout')) return authLogout(req, ctx)
  if (is('GET', 'auth', 'me')) return authMe(req, ctx)
  if (is('POST', 'presign')) return presign(req, ctx)
  if (is('POST', 'presign', 'confirm')) return presignConfirm(req, ctx)
  if (is('POST', 'stripe', 'checkout')) return stripeCheckout(req, ctx)
  if (is('POST', 'stripe', 'webhook')) return stripeWebhook(req, ctx)
  if (a === 'forms' && b && !c && m === 'POST') return submitForm(req, ctx, b)
  if (a === 'admin' && b) {
    if (!c && m === 'GET') return adminList(req, ctx, b)
    if (!c && m === 'POST') return adminCreate(req, ctx, b)
    if (c && path.length === 3 && m === 'GET') return adminGet(req, ctx, b, c)
    if (c && path.length === 3 && m === 'PATCH') return adminUpdate(req, ctx, b, c)
    if (c && path.length === 3 && m === 'DELETE') return adminDelete(req, ctx, b, c)
    if (c && path[3] === 'read' && path.length === 4 && m === 'POST') return adminMarkRead(req, ctx, b, c)
  }
  throw new HttpError(404, 'not_found')
}
