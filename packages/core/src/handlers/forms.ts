import { z } from 'zod'
import { rateLimit } from '../auth/ratelimit'
import { FORMS, submissions, type FormName } from '../db/schema'
import { submissionEmail } from '../email/templates'
import type { Ctx } from './context'
import { clientIp, HttpError, json, readObject } from './http'

const honeypot = { website: z.string().max(0).optional() }

/** SPEC §2.2 — the closed set of public forms and their payloads. */
export const formSchemas: Record<FormName, z.ZodObject> = {
  contact: z.object({
    name: z.string().min(1).max(120),
    email: z.email().max(254),
    message: z.string().min(1).max(4000),
    phone: z.string().max(40).optional(),
    ...honeypot,
  }),
  volunteer: z.object({
    name: z.string().min(1).max(120),
    email: z.email().max(254),
    phone: z.string().max(40).optional(),
    interests: z.string().min(1).max(500),
    availability: z.string().max(500).optional(),
    ...honeypot,
  }),
  newsletter: z.object({
    email: z.email().max(254),
    name: z.string().max(120).optional(),
    ...honeypot,
  }),
  // A sign-up for an event: the event's title travels with it so the inbox reads well without a join.
  register: z.object({
    name: z.string().min(1).max(120),
    email: z.email().max(254),
    phone: z.string().max(40).optional(),
    guests: z.coerce.number().int().min(1).max(20).default(1),
    note: z.string().max(1000).optional(),
    eventId: z.uuid(),
    eventTitle: z.string().min(1).max(160),
    eventDate: z.string().max(80).optional(),
    ...honeypot,
  }),
}

export async function submitForm(req: Request, ctx: Ctx, form: string): Promise<Response> {
  if (!(FORMS as readonly string[]).includes(form)) throw new HttpError(404, 'unknown_form')
  const raw = await readObject(req)
  // Bots fill the honeypot: pretend success, store nothing.
  if (typeof raw['website'] === 'string' && raw['website'].length > 0) return json(200, { ok: true })
  if (!(await rateLimit(ctx.db, `forms:ip:${clientIp(req)}`, 10, 60 * 60))) throw new HttpError(429, 'rate_limited')
  const parsed = formSchemas[form as FormName].safeParse(raw)
  if (!parsed.success) throw new HttpError(400, 'invalid_body', parsed.error.issues)
  const { website: _hp, ...payload } = parsed.data as Record<string, unknown>
  const email = typeof payload['email'] === 'string' ? payload['email'].toLowerCase() : null
  await ctx.db.insert(submissions).values({ form: form as FormName, payload, email })
  // The row is the record; the notification is best effort. A mail outage must not make the visitor resubmit.
  const tpl = submissionEmail({ siteName: ctx.siteName, form, payload, adminUrl: `${ctx.env.NEXT_PUBLIC_SITE_URL}/admin/submissions` })
  await ctx.mailer.send({ from: ctx.env.EMAIL_FROM, to: ctx.env.EMAIL_REPLY_TO, ...(email ? { replyTo: email } : {}), ...tpl }).catch((e: unknown) => console.error('[studio-core] submission notification failed', e))
  return json(200, { ok: true })
}
