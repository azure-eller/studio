import { Resend } from 'resend'

export interface MailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface Mailer {
  send(msg: MailMessage & { from: string }): Promise<void>
}

export function resendMailer(apiKey: string): Mailer {
  const resend = new Resend(apiKey)
  return {
    async send(msg) {
      const { error } = await resend.emails.send({
        from: msg.from,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
      })
      if (error) throw new Error(`resend: ${error.name}: ${error.message}`)
    },
  }
}

/** Collects messages instead of sending. Tests and dry runs. */
export function memoryMailer(): Mailer & { sent: (MailMessage & { from: string })[] } {
  const sent: (MailMessage & { from: string })[] = []
  return {
    sent,
    async send(msg) {
      sent.push(msg)
    },
  }
}
