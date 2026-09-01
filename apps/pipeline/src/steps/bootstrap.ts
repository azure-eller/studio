/**
 * `pipeline bootstrap` — sets up (or verifies) the entire studio from one .env of tokens. Idempotent:
 * safe to run repeatedly; every step reports ok / created / ACTION NEEDED with exact instructions.
 * This is what the designer runs on her own machine after /setup-studio collects her tokens.
 */
import { HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import path from 'node:path'
import { z } from 'zod'
import { cloudflare } from '../clients/cloudflare'
import { neon } from '../clients/neon'
import { vercel } from '../clients/vercel'
import { api } from '../clients/http'

const envSchema = z.object({
  STUDIO_DOMAIN: z.string().min(3),
  DESIGNER_EMAIL: z.email(),
  GH_ORG: z.string().min(1),
  STUDIO_REPO: z.string().default('studio'),
  GH_PAT: z.string().min(1),
  NEON_API_KEY: z.string().min(1),
  NEON_REGION: z.string().default('aws-us-east-1'),
  VERCEL_TOKEN: z.string().min(1),
  VERCEL_TEAM_ID: z.string().min(1).optional(),
  CF_API_TOKEN: z.string().min(1),
  // Required only when STUDIO_DOMAIN=vercel.app (no zone to discover the account id from).
  CF_ACCOUNT_ID: z.string().optional(),
  // vercel.app mode: media serves from the bucket's r2.dev public URL instead of media.<domain>.
  MEDIA_BASE_URL: z.string().url().optional(),
  // vercel.app mode: no studio sending domain can be verified automatically — provide the sender.
  EMAIL_FROM: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().default('studio-media'),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
})

type Report = { step: string; status: 'ok' | 'created' | 'ACTION NEEDED' | 'FAILED'; detail: string }
const R = (fn: string) => `https://api.resend.com${fn}`

export async function bootstrap(repoRoot: string): Promise<number> {
  const cleaned: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) if (v) cleaned[k] = v
  const parsed = envSchema.safeParse(cleaned)
  if (!parsed.success) {
    console.error('Missing configuration in apps/pipeline/.env:')
    for (const i of parsed.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`)
    return 1
  }
  const e = parsed.data
  const resendKey = process.env['RESEND_API_KEY']
  const reports: Report[] = []
  const report = (step: string, status: Report['status'], detail: string) => {
    reports.push({ step, status, detail })
    console.log(`${status === 'ok' ? '✓' : status === 'created' ? '＋' : '✗'} ${step}: ${detail}`)
  }
  const domain = e.STUDIO_DOMAIN.toLowerCase()
  const mediaHost = `media.${domain}`
  const intakeHost = `intake.${domain}`
  const sendDomain = `studio.${domain}`
  // STUDIO_DOMAIN=vercel.app → the studio has no zone of its own: no DNS is managed, sites and the
  // intake app serve on their Vercel-assigned *.vercel.app domains, media serves from MEDIA_BASE_URL
  // (the bucket's r2.dev URL), and EMAIL_FROM must name an address Resend can already send from.
  const noZone = domain === 'vercel.app'
  const mediaBase = e.MEDIA_BASE_URL ?? `https://${mediaHost}`
  const sendFrom = e.EMAIL_FROM ?? `Studio <noreply@${sendDomain}>`
  let intakeUrl = `https://${intakeHost}`

  // 1. Cloudflare zone — discovered, not configured (skipped entirely in vercel.app mode)
  let zoneId = '', accountId = ''
  if (noZone) {
    accountId = e.CF_ACCOUNT_ID ?? ''
    if (!accountId) { report('cloudflare', 'FAILED', 'STUDIO_DOMAIN=vercel.app needs CF_ACCOUNT_ID in .env'); return finish(reports) }
    report('cloudflare', 'ok', `no studio zone (vercel.app mode); R2 account ${accountId.slice(0, 8)}…`)
  } else try {
    const zones = await api<{ result: { id: string; name: string; account: { id: string } }[] }>('cloudflare', 'https://api.cloudflare.com/client/v4/zones?per_page=50', { token: e.CF_API_TOKEN })
    const zone = zones.result.find((z2) => z2.name === domain)
    if (!zone) throw new Error(`token sees zones [${zones.result.map((z2) => z2.name).join(', ')}] but not ${domain}`)
    zoneId = zone.id; accountId = zone.account.id
    report('cloudflare zone', 'ok', `${domain} (zone ${zoneId.slice(0, 8)}…)`)
  } catch (err) {
    report('cloudflare zone', 'FAILED', (err as Error).message.slice(0, 200)); return finish(reports)
  }
  const cf = cloudflare(e.CF_API_TOKEN, zoneId)

  // 2. Neon studio project + migrations
  let pooled = '', direct = ''
  try {
    const orgs = await api<{ organizations?: { id: string }[] }>('neon', 'https://console.neon.tech/api/v2/users/me/organizations', { token: e.NEON_API_KEY })
    const orgId = process.env['NEON_ORG_ID'] ?? orgs.organizations?.[0]?.id
    const ne = neon(e.NEON_API_KEY, { orgId, region: e.NEON_REGION })
    let project = await ne.findProject('studio')
    if (!project) { project = await ne.createProject('studio'); report('neon studio project', 'created', project.id) }
    else report('neon studio project', 'ok', project.id)
    const uris = await ne.connectionUris(project.id)
    pooled = uris.pooled; direct = uris.direct
    const mig = spawnSync('pnpm', ['--filter', '@studio/pipeline', 'db:migrate'], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, STUDIO_DATABASE_URL_UNPOOLED: direct } })
    if (mig.status !== 0) throw new Error('migrations failed: ' + mig.stderr.slice(-200))
    report('studio database migrations', 'ok', 'briefs, builds, invites')
  } catch (err) { report('neon', 'FAILED', (err as Error).message.slice(0, 200)); return finish(reports) }

  // 3. R2 bucket probe (bucket + CORS + custom domain are dashboard steps if missing)
  const s3 = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, forcePathStyle: true, credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY } })
  try {
    await s3.send(new HeadBucketCommand({ Bucket: e.R2_BUCKET }))
    await s3.send(new PutObjectCommand({ Bucket: e.R2_BUCKET, Key: 'bootstrap/probe.txt', Body: 'ok', ContentType: 'text/plain' }))
    const pub = await fetch(`${mediaBase}/bootstrap/probe.txt`).catch(() => null)
    await s3.send(new DeleteObjectCommand({ Bucket: e.R2_BUCKET, Key: 'bootstrap/probe.txt' }))
    if (pub?.status === 200) report('r2 bucket + media url', 'ok', `${e.R2_BUCKET} serves at ${mediaBase}`)
    else if (noZone) report('r2 media url', 'ACTION NEEDED', `Cloudflare → R2 → ${e.R2_BUCKET} → Settings → enable the Public Development URL and set MEDIA_BASE_URL in .env`)
    else report('r2 media domain', 'ACTION NEEDED', `Cloudflare → R2 → ${e.R2_BUCKET} → Settings → Custom Domains → add ${mediaHost}`)
    const pre = await fetch(`https://${accountId}.r2.cloudflarestorage.com/${e.R2_BUCKET}/x`, { method: 'OPTIONS', headers: { Origin: `https://${intakeHost}`, 'Access-Control-Request-Method': 'PUT' } })
    if (pre.status === 204 || pre.headers.get('access-control-allow-origin')) report('r2 CORS', 'ok', 'browser uploads allowed')
    else report('r2 CORS', 'ACTION NEEDED', `Cloudflare → R2 → ${e.R2_BUCKET} → Settings → CORS policy → [{"AllowedOrigins":["https://*.${domain}","http://localhost:3000","http://localhost:3200"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]`)
  } catch {
    report('r2 bucket', 'ACTION NEEDED', `create bucket "${e.R2_BUCKET}" in Cloudflare → R2 (then re-run bootstrap)`)
  }

  // 4. Resend sending subdomain + DNS + DMARC (needs a zone; vercel.app mode relies on EMAIL_FROM)
  if (!resendKey) report('resend', 'ACTION NEEDED', 'RESEND_API_KEY missing from .env')
  else if (noZone) {
    if (e.EMAIL_FROM) report('resend sender', 'ok', `using ${sendFrom} — make sure its domain is verified in Resend`)
    else report('resend sender', 'ACTION NEEDED', 'no studio zone: verify a domain in Resend and set EMAIL_FROM in .env (interim: "Studio <onboarding@resend.dev>" delivers only to the Resend account owner)')
  }
  else
    try {
      const call = (p2: string, method = 'GET', body?: unknown) => api<Record<string, unknown>>('resend', R(p2), { token: resendKey, method, ...(body ? { body: JSON.stringify(body) } : {}) })
      const doms = (await call('/domains')) as { data?: { id: string; name: string; status: string }[] }
      let dom = doms.data?.find((d) => d.name === sendDomain)
      if (!dom) { dom = (await call('/domains', 'POST', { name: sendDomain, region: 'us-east-1' })) as never; report('resend domain', 'created', sendDomain) }
      const detail = (await call(`/domains/${dom!.id}`)) as { status: string; records: { name: string; type: string; value: string; priority?: number }[] }
      for (const r of detail.records) {
        const name = `${r.name}.${domain}`
        const body = { type: r.type, name, content: r.value, ttl: 300, proxied: false, ...(r.type === 'MX' ? { priority: Number(r.priority ?? 10) } : {}) }
        await api('cloudflare', `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, { token: e.CF_API_TOKEN, method: 'POST', body: JSON.stringify(body), expect: [200, 400] })
      }
      await cf.upsertCname(`_dmarc.${sendDomain}`).catch(() => null)
      await api('cloudflare', `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, { token: e.CF_API_TOKEN, method: 'POST', body: JSON.stringify({ type: 'TXT', name: `_dmarc.${sendDomain}`, content: 'v=DMARC1; p=none', ttl: 300 }), expect: [200, 400] })
      await call(`/domains/${dom!.id}/verify`, 'POST')
      report('resend sending domain', detail.status === 'verified' ? 'ok' : 'created', `${sendDomain} (${detail.status === 'verified' ? 'verified' : 'verifying — re-run bootstrap in a few minutes to confirm'})`)
    } catch (err) { report('resend', 'FAILED', (err as Error).message.slice(0, 200)) }

  // 5. GitHub secrets + variables (via gh CLI if present)
  const repoFull = `${e.GH_ORG}/${e.STUDIO_REPO}`
  const gh = (args: string[], input?: string) => spawnSync('gh', args, { encoding: 'utf8', input, env: { ...process.env, GH_TOKEN: e.GH_PAT } })
  if (gh(['--version']).status === 0) {
    const secrets: Record<string, string> = { STUDIO_DATABASE_URL: pooled, GH_PAT: e.GH_PAT, NEON_API_KEY: e.NEON_API_KEY, VERCEL_TOKEN: e.VERCEL_TOKEN, CF_API_TOKEN: e.CF_API_TOKEN, R2_ACCESS_KEY_ID: e.R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY: e.R2_SECRET_ACCESS_KEY, ...(resendKey ? { RESEND_API_KEY: resendKey } : {}), ...(e.CLAUDE_CODE_OAUTH_TOKEN ? { CLAUDE_CODE_OAUTH_TOKEN: e.CLAUDE_CODE_OAUTH_TOKEN } : {}) }
    const vars: Record<string, string> = { STUDIO_DOMAIN: domain, MEDIA_BASE_URL: mediaBase, DESIGNER_EMAIL: e.DESIGNER_EMAIL, EMAIL_FROM: sendFrom, NEON_REGION: e.NEON_REGION, CF_ZONE_ID: zoneId, CF_ACCOUNT_ID: accountId, R2_BUCKET: e.R2_BUCKET, MAX_TURNS: '100', ...(process.env['NEON_ORG_ID'] ? { NEON_ORG_ID: process.env['NEON_ORG_ID']! } : {}) }
    let fails = 0
    for (const [k, v] of Object.entries(secrets)) if (gh(['secret', 'set', k, '-R', repoFull], v).status !== 0) fails++
    for (const [k, v] of Object.entries(vars)) if (gh(['variable', 'set', k, '-R', repoFull, '-b', v]).status !== 0) fails++
    report('github secrets + variables', fails ? 'FAILED' : 'ok', fails ? `${fails} failed — is the repo ${repoFull} pushed and GH_PAT valid?` : `${Object.keys(secrets).length} secrets, ${Object.keys(vars).length} variables on ${repoFull}`)
    if (!e.CLAUDE_CODE_OAUTH_TOKEN) report('claude token', 'ACTION NEEDED', 'run `claude setup-token`, add CLAUDE_CODE_OAUTH_TOKEN to apps/pipeline/.env, re-run bootstrap')
  } else report('github', 'ACTION NEEDED', 'install the gh CLI (https://cli.github.com), then re-run bootstrap')

  // 6. Vercel intake project + env + domain + DNS
  try {
    const vc = vercel(e.VERCEL_TOKEN, e.VERCEL_TEAM_ID)
    let p: { id: string } | null = await vc.findProject('studio-intake')
    if (!p) {
      const res = await fetch('https://api.vercel.com/v11/projects' + (e.VERCEL_TEAM_ID ? `?teamId=${e.VERCEL_TEAM_ID}` : ''), { method: 'POST', headers: { authorization: 'Bearer ' + e.VERCEL_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'studio-intake', framework: 'nextjs', gitRepository: { type: 'github', repo: repoFull }, rootDirectory: 'apps/intake', buildCommand: 'pnpm --filter @studio/core build && pnpm run build' }) })
      const j = (await res.json()) as { id: string; error?: { message: string } }
      if (!res.ok) throw new Error(j.error?.message ?? 'project create failed — is the Vercel GitHub app installed for this repo?')
      p = j as { id: string }
      await fetch('https://api.vercel.com/v9/projects/' + p!.id + (e.VERCEL_TEAM_ID ? `?teamId=${e.VERCEL_TEAM_ID}` : ''), { method: 'PATCH', headers: { authorization: 'Bearer ' + e.VERCEL_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ nodeVersion: '22.x' }) })
      report('vercel intake project', 'created', p!.id)
    } else report('vercel intake project', 'ok', p.id)
    if (noZone) {
      const dd = await vc.defaultDomain(p!.id)
      if (dd) intakeUrl = `https://${dd}`
    }
    const existing = await vc.envKeys(p!.id)
    await vc.setEnv(p!.id, {
      STUDIO_DATABASE_URL: pooled, STUDIO_DOMAIN: domain, INTAKE_URL: intakeUrl, GH_PAT: e.GH_PAT, GH_ORG: e.GH_ORG, STUDIO_REPO: e.STUDIO_REPO,
      DESIGNER_EMAIL: e.DESIGNER_EMAIL, EMAIL_FROM: sendFrom, ...(resendKey ? { RESEND_API_KEY: resendKey } : {}), CF_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: e.R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY: e.R2_SECRET_ACCESS_KEY, R2_BUCKET: e.R2_BUCKET, MEDIA_BASE_URL: mediaBase,
      STUDIO_ADMIN_EMAILS: e.DESIGNER_EMAIL, TEMPLATE_DIR: '../../template', ...(existing.has('STUDIO_AUTH_SECRET') ? {} : { STUDIO_AUTH_SECRET: crypto.randomBytes(32).toString('hex') }),
      VERCEL_TOKEN: e.VERCEL_TOKEN, ...(e.VERCEL_TEAM_ID ? { VERCEL_TEAM_ID: e.VERCEL_TEAM_ID } : {}),
    })
    if (!noZone) {
      await vc.addDomain(p!.id, intakeHost)
      await cf.upsertCname(intakeHost)
    }
    report('intake app', 'ok', `${intakeUrl} (env set; deploys on the next git push)`)
  } catch (err) { report('vercel intake', 'FAILED', (err as Error).message.slice(0, 200)) }

  // 7. write STUDIO_DATABASE_URL back for local CLI use
  try {
    const fs = await import('node:fs')
    const envPath = path.join(repoRoot, 'apps/pipeline/.env')
    let txt = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
    for (const [k, v] of [['STUDIO_DATABASE_URL', pooled], ['STUDIO_DATABASE_URL_UNPOOLED', direct], ['CF_ZONE_ID', zoneId], ['CF_ACCOUNT_ID', accountId], ['MEDIA_BASE_URL', mediaBase], ['INTAKE_URL', intakeUrl], ['EMAIL_FROM', sendFrom], ['TEMPLATE_DIR', path.join(repoRoot, 'template')]] as [string, string][]) {
      txt = txt.split('\n').filter((l) => !l.startsWith(k + '=')).join('\n').replace(/\n+$/, '\n')
      txt += `${k}="${v}"\n`
    }
    fs.writeFileSync(envPath, txt, { mode: 0o600 })
    report('local .env', 'ok', 'connection strings and derived values written back')
  } catch (err) { report('local .env', 'FAILED', (err as Error).message.slice(0, 120)) }

  return finish(reports)
}

function finish(reports: Report[]): number {
  const actions = reports.filter((r) => r.status === 'ACTION NEEDED')
  const failed = reports.filter((r) => r.status === 'FAILED')
  console.log('')
  if (failed.length) console.log(`${failed.length} step(s) failed — fix and re-run \`pnpm pipeline bootstrap\` (it is safe to repeat).`)
  else if (actions.length) console.log(`${actions.length} manual step(s) remain (listed above) — do them, then re-run \`pnpm pipeline bootstrap\` to confirm.`)
  else console.log('Everything is set up. Try it: `pnpm invite you@example.org` and fill in the form it prints.')
  return failed.length ? 1 : 0
}
