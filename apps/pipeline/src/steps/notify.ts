/** notify — one email to the designer: "it's done, check it out" (or "it failed, here's why"). */
import fs from 'node:fs'
import path from 'node:path'
import { Resend } from 'resend'
import { loadEnv, namesFor } from '../config'
import type { Run } from '../run'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export async function notify(run: Run, outcome: 'done' | 'failed', error?: string): Promise<void> {
  const env = loadEnv('notify')
  await run.setStep('notify')
  const brief = run.brief.brief as { org?: { name?: string } } | null
  const name = brief?.org?.name ?? run.brief.slug
  const n = namesFor(run.brief.slug, env.STUDIO_DOMAIN)
  const b = run.build
  const usage = `${b.modelTurns ?? '?'} turns · $${(b.modelCostUsd ?? 0).toFixed(2)} · ${Math.round((b.modelDurationMs ?? 0) / 60000)} min${b.fixAttempts ? ` · ${b.fixAttempts} fix pass${b.fixAttempts > 1 ? 'es' : ''}` : ''}`
  const repoUrl = run.brief.repoUrl ?? (b.repoFullName ? `https://github.com/${b.repoFullName}` : '')
  const links = ([
    ['Live site', n.siteUrl],
    ['Admin', `${n.siteUrl}/admin`],
    ['Repository', repoUrl],
    ['Vercel', b.vercelProjectId && env.VERCEL_TEAM_ID ? `https://vercel.com/${env.VERCEL_TEAM_ID}/${n.vercelProject}` : ''],
  ] as [string, string][]).filter(([, u]) => u)

  const attachments: { filename: string; content: string }[] = []
  for (const f of ['home-desktop.png', 'home-mobile.png']) {
    const p = path.join(run.workDir, '.artifacts', f)
    if (fs.existsSync(p)) attachments.push({ filename: f, content: fs.readFileSync(p).toString('base64') })
  }

  const subject = outcome === 'done' ? `✅ ${name} is built — take a look` : `❌ ${name} build failed`
  const body =
    outcome === 'done'
      ? `<p>The site for <strong>${esc(name)}</strong> is live on the studio subdomain.</p>
<ul>${links.map(([l, u]) => `<li><a href="${esc(u)}">${esc(l)}</a></li>`).join('')}</ul>
<p style="color:#666">Model usage: ${esc(usage)}</p>
<p>Screenshots attached. Next: review, iterate in Claude Code on the web if needed, then add the client's domain and Stripe keys from the studio console.</p>`
      : `<p>The build for <strong>${esc(name)}</strong> failed at step <code>${esc(b.step ?? '?')}</code>.</p>
<pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px">${esc((error ?? '').slice(0, 4000))}</pre>
<p style="color:#666">Model usage: ${esc(usage)}</p>
<p>Log tail:</p><pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px">${esc(b.log.slice(-6000))}</pre>`
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;max-width:640px;margin:0 auto;padding:24px"><h1 style="font-size:20px">${esc(subject)}</h1>${body}</body></html>`

  if (env.DRY_RUN) {
    await run.log(`DRY RUN — would email ${env.DESIGNER_EMAIL}: ${subject}`)
    return
  }
  const resend = new Resend(env.RESEND_API_KEY)
  const { error: err } = await resend.emails.send({ from: env.EMAIL_FROM, to: [env.DESIGNER_EMAIL], subject, html, attachments })
  if (err) throw new Error(`resend: ${err.message}`)
  await run.log(`emailed ${env.DESIGNER_EMAIL}: ${subject}`)
}
