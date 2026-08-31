import { Resend } from 'resend'
import { env } from './env'

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const e = env()
  const { error } = await new Resend(e.RESEND_API_KEY).emails.send({ from: e.EMAIL_FROM, to: [to], subject, html })
  if (error) throw new Error(`resend: ${error.message}`)
}
