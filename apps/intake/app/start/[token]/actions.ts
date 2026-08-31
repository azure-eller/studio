'use server'
/**
 * Server actions for the intake form. Every action re-checks the invite; nothing here trusts the client.
 * Step 1 reserves the slug (and so the R2 prefix); uploads presign straight into sites/<slug>/; submit validates
 * against template/lib/brief.ts, marks the brief queued and dispatches the build. No human approves anything.
 */
import { and, eq, gt, isNull } from 'drizzle-orm'
import { briefSchema } from '@template/lib/brief'
import { dispatchBuild } from '@/lib/dispatch'
import { briefs, invites, studioDb } from '@/lib/db'
import { env } from '@/lib/env'
import { sendMail } from '@/lib/mail'
import { presignIntakeUpload } from '@/lib/r2'
import { slugify } from '@/lib/slug'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'])
const MAX_BYTES = 25 * 1024 * 1024

async function validInvite(token: string) {
  const db = studioDb()
  const [inv] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), gt(invites.expiresAt, new Date())))
    .limit(1)
  if (!inv) throw new Error('invalid_invite')
  return inv
}

/** Step 1: reserve a slug for this invite. Re-entrant: the same invite always gets the same brief row. */
export async function reserveSlug(token: string, orgName: string): Promise<{ briefId: string; slug: string }> {
  const inv = await validInvite(token)
  const db = studioDb()
  const existing = (await db.select().from(briefs).where(eq(briefs.inviteId, inv.id)).limit(1))[0]
  if (existing) return { briefId: existing.id, slug: existing.slug }
  const base = slugify(orgName)
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    const taken = (await db.select({ id: briefs.id }).from(briefs).where(eq(briefs.slug, slug)).limit(1))[0]
    if (taken) continue
    const [row] = await db.insert(briefs).values({ slug, inviteId: inv.id, clientEmail: inv.email, status: 'draft' }).returning()
    return { briefId: row!.id, slug: row!.slug }
  }
  throw new Error('could not reserve a slug')
}

/** Uploads: the browser measured the image; the server only signs. */
export async function presignUpload(token: string, briefId: string, file: { name: string; type: string; size: number }): Promise<{ url: string; key: string }> {
  await validInvite(token)
  if (!ALLOWED_MIME.has(file.type)) throw new Error('unsupported_file_type')
  if (file.size > MAX_BYTES) throw new Error('file_too_large')
  const [row] = await studioDb().select().from(briefs).where(eq(briefs.id, briefId)).limit(1)
  if (!row || row.status !== 'draft') throw new Error('brief_not_editable')
  return presignIntakeUpload(row.slug, file.name, file.type, file.size)
}

/** Autosave: keep the draft so a closed tab loses nothing. Not validated (drafts are allowed to be incomplete). */
export async function saveDraft(token: string, briefId: string, draft: Record<string, unknown>): Promise<void> {
  await validInvite(token)
  const db = studioDb()
  await db.update(briefs).set({ brief: draft }).where(and(eq(briefs.id, briefId), eq(briefs.status, 'draft')))
}

export async function submitBrief(token: string, briefId: string, draft: Record<string, unknown>): Promise<{ ok: true } | { ok: false; issues: { path: string; message: string }[] }> {
  const inv = await validInvite(token)
  const db = studioDb()
  const [row] = await db.select().from(briefs).where(eq(briefs.id, briefId)).limit(1)
  if (!row || row.status !== 'draft') throw new Error('brief_not_editable')
  const parsed = briefSchema.safeParse({ ...draft, version: 1, slug: row.slug })
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }
  const brief = parsed.data
  await db.update(briefs).set({ brief, status: 'queued', clientEmail: brief.contact.email }).where(eq(briefs.id, briefId))
  await db.update(invites).set({ usedAt: new Date() }).where(and(eq(invites.id, inv.id), isNull(invites.usedAt)))
  const e = env()
  // The brief is queued regardless; a dispatch failure is the studio's problem, never the client's.
  let dispatchNote = ''
  try {
    await dispatchBuild(briefId)
  } catch (err) {
    dispatchNote = ` <strong>Build dispatch failed:</strong> ${(err as Error).message.slice(0, 200)} — start it from the studio console or \`pnpm pipeline run ${briefId}\`.`
  }
  await sendMail(brief.contact.email, `We're building the ${brief.org.name} website`, `<p>Thanks — we have everything we need. Your site is being built now; you'll hear from us when it's ready to look at.</p>`).catch(() => {})
  await sendMail(e.DESIGNER_EMAIL, `New brief queued: ${brief.org.name}`, `<p><strong>${brief.org.name}</strong> (${row.slug}) submitted their brief${dispatchNote ? '.' : ' and the build has been dispatched.'}${dispatchNote}</p><p>Direction: ${brief.direction} · pages: ${brief.pages.join(', ')}</p>`).catch(() => {})
  return { ok: true }
}
