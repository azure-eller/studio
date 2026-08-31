import type { Env } from '../env'
import { resendMailer, type Mailer, type MailMessage } from './mailer'

let defaultMailer: Mailer | undefined

/** Sends from EMAIL_FROM with reply-to = the client unless overridden. */
export async function sendMail(
  env: Pick<Env, 'RESEND_API_KEY' | 'EMAIL_FROM' | 'EMAIL_REPLY_TO'>,
  msg: MailMessage,
  mailer?: Mailer,
): Promise<void> {
  const m = mailer ?? (defaultMailer ??= resendMailer(env.RESEND_API_KEY))
  await m.send({ from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO, ...msg })
}
