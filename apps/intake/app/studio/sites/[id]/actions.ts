'use server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { addDomain, setAdmins, setStripe } from '@studio/pipeline/src/steps/golive'
import { briefs, studioDb } from '@/lib/db'
import { currentAdmin } from '@/lib/studio-auth'

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
