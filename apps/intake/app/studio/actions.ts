'use server'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { dispatchBuild } from '@/lib/dispatch'
import { briefs, invites, studioDb } from '@/lib/db'
import { env } from '@/lib/env'
import { sendMail } from '@/lib/mail'
import { currentAdmin, endSession, isAdmin, magicToken } from '@/lib/studio-auth'

const requireAdmin = async () => {
  const a = await currentAdmin()
  if (!a) redirect('/studio/login')
  return a
}

export async function requestLogin(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (email && isAdmin(email)) {
    const url = `${env().INTAKE_URL}/studio/auth?t=${await magicToken(email)}`
    await sendMail(email, 'Sign in to the studio console', `<p><a href="${url}">Sign in</a> — this link works for 15 minutes.</p>`)
  }
  redirect('/studio/login?sent=1')
}

export async function logout(): Promise<void> {
  await endSession()
  redirect('/studio/login')
}

export async function createInvite(formData: FormData): Promise<void> {
  await requireAdmin()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const note = String(formData.get('note') ?? '').trim() || null
  if (!email) redirect('/studio/invite?error=email')
  const token = crypto.randomBytes(24).toString('base64url')
  await studioDb().insert(invites).values({ token, email, note, expiresAt: new Date(Date.now() + 30 * 86_400_000) })
  const link = `${env().INTAKE_URL}/start/${token}`
  if (formData.get('send') === '1') {
    await sendMail(email, 'Your website brief', `<p>Hello${note ? ` ${note}` : ''},</p><p>Use this link to tell us about your organisation and what you'd like the site to do. It takes about 20 minutes, and you can come back to it: <a href="${link}">${link}</a></p>`).catch(() => {})
  }
  redirect(`/studio/invite?link=${encodeURIComponent(link)}`)
}

export async function rerunBuild(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('brief_id') ?? '')
  const [row] = await studioDb().select().from(briefs).where(eq(briefs.id, id)).limit(1)
  if (!row || !row.brief) redirect('/studio?error=no_brief')
  await studioDb().update(briefs).set({ status: 'queued' }).where(eq(briefs.id, id))
  try {
    await dispatchBuild(id)
  } catch (err) {
    redirect(`/studio?error=${encodeURIComponent('Queued, but dispatch failed: ' + (err as Error).message.slice(0, 160))}`)
  }
  redirect('/studio?rerun=1')
}
