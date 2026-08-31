// One-off: create/refresh the Vercel project for apps/intake, set env, attach intake.<studio domain>, deploy main.
import crypto from 'node:crypto'
import { cloudflare } from '../src/clients/cloudflare'
import { vercel } from '../src/clients/vercel'
const e = process.env as Record<string, string>
const H = { authorization: 'Bearer ' + e.VERCEL_TOKEN, 'content-type': 'application/json' }
const vc = vercel(e.VERCEL_TOKEN)
let p = await vc.findProject('studio-intake')
if (!p) {
  const r = await fetch('https://api.vercel.com/v11/projects', { method: 'POST', headers: H, body: JSON.stringify({ name: 'studio-intake', framework: 'nextjs', gitRepository: { type: 'github', repo: 'azure-eller/studio' }, rootDirectory: 'apps/intake', buildCommand: 'pnpm --filter @studio/core build && pnpm run build' }) })
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); p = j
  await fetch('https://api.vercel.com/v9/projects/' + p!.id, { method: 'PATCH', headers: H, body: JSON.stringify({ nodeVersion: '22.x' }) })
  console.log('created studio-intake', p!.id)
} else console.log('studio-intake exists', p.id)
const existing = await (await fetch('https://api.vercel.com/v9/projects/' + p!.id + '/env', { headers: H })).json() as { envs: { key: string }[] }
const hasSecret = existing.envs.some((v) => v.key === 'STUDIO_AUTH_SECRET')
const vars: Record<string, string> = {
  STUDIO_DATABASE_URL: e.STUDIO_DATABASE_URL, STUDIO_DOMAIN: e.STUDIO_DOMAIN, INTAKE_URL: 'https://intake.' + e.STUDIO_DOMAIN, GH_PAT: e.GH_PAT, GH_ORG: e.GH_ORG, STUDIO_REPO: 'studio',
  DESIGNER_EMAIL: e.DESIGNER_EMAIL, EMAIL_FROM: e.EMAIL_FROM, RESEND_API_KEY: e.RESEND_API_KEY, CF_ACCOUNT_ID: e.CF_ACCOUNT_ID, R2_ACCESS_KEY_ID: e.R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY: e.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: e.R2_BUCKET, MEDIA_BASE_URL: e.MEDIA_BASE_URL, STUDIO_ADMIN_EMAILS: e.DESIGNER_EMAIL, TEMPLATE_DIR: '../../template',
  ...(hasSecret ? {} : { STUDIO_AUTH_SECRET: crypto.randomBytes(32).toString('hex') }),
}
await vc.setEnv(p!.id, vars); console.log('env set', Object.keys(vars).length)
await vc.addDomain(p!.id, 'intake.' + e.STUDIO_DOMAIN); console.log('domain added')
console.log('cname', await cloudflare(e.CF_API_TOKEN, e.CF_ZONE_ID).upsertCname('intake.' + e.STUDIO_DOMAIN))
const dep = await fetch('https://api.vercel.com/v13/deployments', { method: 'POST', headers: H, body: JSON.stringify({ name: 'studio-intake', project: p!.id, target: 'production', gitSource: { type: 'github', repoId: 1351937693, ref: 'main' } }) })
const dj = await dep.json(); console.log('deployment', dep.ok ? dj.id + ' ' + dj.readyState : JSON.stringify(dj).slice(0, 300))
