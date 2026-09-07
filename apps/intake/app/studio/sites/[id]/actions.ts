'use server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { addDomain, dnsInstructions, registrarFor, setAdmins, setStripe } from '@studio/pipeline/src/steps/golive'
import { sendMail } from '@/lib/mail'
import { briefs, studioDb } from '@/lib/db'
import { currentAdmin } from '@/lib/studio-auth'
import { escapeHtml } from '@/lib/html'

async function guard(id: string) {
  if (!(await currentAdmin())) redirect('/studio/login')
  const [b] = await studioDb().select().from(briefs).where(eq(briefs.id, id)).limit(1)
  if (!b) redirect('/studio')
  return b
}
const back = (id: string, msg: string, kind: 'ok' | 'err') => redirect(`/studio/sites/${id}?${kind}=${encodeURIComponent(msg)}`)

export async function actionAddDomain(formData: FormData): Promise<void> {
  const id = String(formData.get('id'))
  const b = await guard(id)
  const domain = String(formData.get('domain') ?? '').trim()
  if (!domain) back(id, 'Enter a domain', 'err')
  try {
    back(id, await addDomain(studioDb(), b.slug, domain), 'ok')
  } catch (e) {
    if ((e as Error).message === 'NEXT_REDIRECT') throw e
    back(id, (e as Error).message, 'err')
  }
}

export async function actionSetAdmins(formData: FormData): Promise<void> {
  const id = String(formData.get('id'))
  const b = await guard(id)
  const emails = String(formData.get('emails') ?? '').split(/[,\s]+/).filter(Boolean)
  try {
    back(id, await setAdmins(studioDb(), b.slug, emails), 'ok')
  } catch (e) {
    if ((e as Error).message === 'NEXT_REDIRECT') throw e
    back(id, (e as Error).message, 'err')
  }
}

export async function actionSetStripe(formData: FormData): Promise<void> {
  const id = String(formData.get('id'))
  const b = await guard(id)
  try {
    back(id, await setStripe(studioDb(), b.slug, String(formData.get('secretKey') ?? '').trim(), String(formData.get('webhookSecret') ?? '').trim()), 'ok')
  } catch (e) {
    if ((e as Error).message === 'NEXT_REDIRECT') throw e
    back(id, (e as Error).message, 'err')
  }
}

/** Email the client the two DNS records in plain English. */
export async function actionEmailDns(formData: FormData): Promise<void> {
  const id = String(formData.get('id'))
  const b = await guard(id)
  const host = (b.siteUrl ?? '').replace(/^https?:\/\//, '')
  if (!host) back(id, 'Attach a domain first', 'err')
  try {
    const text = dnsInstructions(host, await registrarFor(host))
    await sendMail(b.clientEmail, `Point ${host} at your new website`, `<p>Your new website is ready.</p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(text)}</pre><p>Reply to this email if you get stuck.</p>`)
    back(id, `Instructions emailed to ${b.clientEmail}`, 'ok')
  } catch (e) {
    if ((e as Error).message === 'NEXT_REDIRECT') throw e
    back(id, (e as Error).message, 'err')
  }
}
