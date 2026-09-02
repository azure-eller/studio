import Stripe from 'stripe'
import type { Collections } from '../collections/types'
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

export interface SiteHandlers {
  GET: RouteHandler
  POST: RouteHandler
  PATCH: RouteHandler
  DELETE: RouteHandler
}

/** SPEC §1.2 — mount at `app/api/site/[...path]/route.ts`. */
export function createSiteHandlers(opts: { db: Db; env: Env; collections: Collections; deps?: HandlerDeps }): SiteHandlers {
  const { db, env, collections, deps = {} } = opts
  const ctx: Ctx = {
    db,
    env,
    collections,
    mailer: deps.mailer ?? resendMailer(env.RESEND_API_KEY),
    stripe: deps.stripe !== undefined ? deps.stripe : env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null,
    s3: deps.s3 ?? r2Client(env),
    now: deps.now ?? (() => new Date()),
    siteName: deps.siteName ?? new URL(env.NEXT_PUBLIC_SITE_URL).hostname,
  }

  const handle: RouteHandler = async (req, routeCtx) => {
    const params = await routeCtx.params
    const path = params.path ?? []
    try {
      return await route(req, ctx, path)
    } catch (e) {
      const err = e instanceof HttpError ? e : pgErrorToHttp(e)
      if (err) return json(err.status, { error: err.message, ...(err.issues ? { issues: err.issues } : {}) })
      console.error('[studio-core]', e)
      return json(500, { error: 'internal_error' })
    }
  }
  return { GET: handle, POST: handle, PATCH: handle, DELETE: handle }
}

async function route(req: Request, ctx: Ctx, path: string[]): Promise<Response> {
  const m = req.method
  const [a, b, c] = path
  const is = (method: string, ...segs: (string | undefined)[]) =>
    m === method && segs.length === path.length && segs.every((s, i) => s === undefined || s === path[i])

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
