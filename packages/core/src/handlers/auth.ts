import { rateLimit } from '../auth/ratelimit'
import { consumeMagicLink, createMagicLink } from '../auth/tokens'
import { clearSessionCookie, createSession, deleteSession, readSession, sessionCookie, signSessionToken } from '../auth/session'
import { magicLinkEmail } from '../email/templates'
import { z } from 'zod'
import type { Ctx } from './context'
import { apiBaseFrom, clientIp, HttpError, json, readJson, redirect } from './http'

const requestSchema = z.object({ email: z.email().max(254) })

export async function authRequest(req: Request, ctx: Ctx, route: string[]): Promise<Response> {
  const body = requestSchema.safeParse(await readJson(req))
  if (!body.success) throw new HttpError(400, 'invalid_body', body.error.issues)
  const email = body.data.email.toLowerCase()
  const okIp = await rateLimit(ctx.db, `auth:ip:${clientIp(req)}`, 20, 15 * 60)
  const okEmail = await rateLimit(ctx.db, `auth:email:${email}`, 5, 10 * 60)
  if (!okIp || !okEmail) throw new HttpError(429, 'rate_limited')
  if (ctx.env.ADMIN_EMAILS.includes(email)) {
    const token = await createMagicLink(ctx.db, email, ctx.now())
    const base = apiBaseFrom(req, route)
    const url = `${ctx.env.NEXT_PUBLIC_SITE_URL}${base}/auth/verify?token=${token}`
    const tpl = magicLinkEmail({ siteName: ctx.siteName, url })
    await ctx.mailer.send({ from: ctx.env.EMAIL_FROM, to: email, ...tpl })
  }
  // Always 200: no account enumeration.
  return json(200, { ok: true })
}

export async function authVerify(req: Request, ctx: Ctx): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const email = await consumeMagicLink(ctx.db, token, ctx.now())
  if (!email || !ctx.env.ADMIN_EMAILS.includes(email)) return redirect('/admin?error=invalid_link')
  const sid = await createSession(ctx.db, email, ctx.now())
  const jwt = await signSessionToken(ctx.env.AUTH_SECRET, sid)
  return redirect('/admin', { 'set-cookie': sessionCookie(jwt) })
}

export async function authLogout(req: Request, ctx: Ctx): Promise<Response> {
  const s = await readSession(ctx.db, ctx.env.AUTH_SECRET, req, ctx.now())
  if (s) await deleteSession(ctx.db, s.id)
  return json(200, { ok: true }, { 'set-cookie': clearSessionCookie() })
}

/** 200 either way: a 401 here would log a console error on every admin page load before sign-in. */
export async function authMe(req: Request, ctx: Ctx): Promise<Response> {
  const s = await readSession(ctx.db, ctx.env.AUTH_SECRET, req, ctx.now())
  return json(200, { email: s?.email ?? null })
}

/** The allowlist is the ACL: a session whose email was removed from ADMIN_EMAILS is revoked on its next request. */
export async function requireSession(req: Request, ctx: Ctx) {
  const s = await readSession(ctx.db, ctx.env.AUTH_SECRET, req, ctx.now())
  if (!s) throw new HttpError(401, 'unauthorized')
  if (!ctx.env.ADMIN_EMAILS.includes(s.email)) {
    await deleteSession(ctx.db, s.id)
    throw new HttpError(401, 'unauthorized')
  }
  return s
}
