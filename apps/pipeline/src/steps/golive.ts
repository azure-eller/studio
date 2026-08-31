/**
 * Go-live CLIs (Phase 4). Each is a small, idempotent change to an existing site's Vercel project,
 * followed by a redeploy — env changes need one. The designer runs these from the studio console later; the developer from the CLI now.
 */
import { eq } from 'drizzle-orm'
import { vercel } from '../clients/vercel'
import { loadEnv, namesFor } from '../config'
import { briefs } from '../db/schema'
import type { StudioDb } from '../db/client'

async function projectFor(db: StudioDb, slug: string) {
  const env = loadEnv('ship')
  const [brief] = await db.select().from(briefs).where(eq(briefs.slug, slug)).limit(1)
  if (!brief) throw new Error(`unknown slug ${slug}`)
  const vc = vercel(env.VERCEL_TOKEN, env.VERCEL_TEAM_ID)
  const project = await vc.findProject(namesFor(slug, env.STUDIO_DOMAIN).vercelProject)
  if (!project) throw new Error(`no vercel project for ${slug}`)
  return { env, brief, vc, project }
}

/** Attach the client's domain: Vercel domain + NEXT_PUBLIC_SITE_URL (which lifts noindex) + redeploy. Prints the DNS record for the client. */
export async function addDomain(db: StudioDb, slug: string, domain: string): Promise<string> {
  const { vc, project } = await projectFor(db, slug)
  const host = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  await vc.addDomain(project.id, host)
  if (!host.startsWith('www.')) await vc.addDomain(project.id, `www.${host}`)
  await vc.setEnv(project.id, { NEXT_PUBLIC_SITE_URL: `https://${host}` })
  await db.update(briefs).set({ siteUrl: `https://${host}` }).where(eq(briefs.slug, slug))
  await vc.redeploy(project.id)
  return [
    `Domain ${host} added to ${slug}; NEXT_PUBLIC_SITE_URL updated (noindex lifted) and redeploy started.`,
    `Ask the client to add at their DNS host:`,
    host.split('.').length > 2 ? `  CNAME  ${host}  →  cname.vercel-dns.com` : `  A      ${host}  →  76.76.21.21\n  CNAME  www.${host}  →  cname.vercel-dns.com`,
    `Vercel issues the certificate once the record resolves.`,
  ].join('\n')
}

/** Replace ADMIN_EMAILS and redeploy. */
export async function setAdmins(db: StudioDb, slug: string, emails: string[]): Promise<string> {
  const { vc, project } = await projectFor(db, slug)
  const list = emails.map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!list.length) throw new Error('at least one email')
  await vc.setEnv(project.id, { ADMIN_EMAILS: list.join(',') })
  await vc.redeploy(project.id)
  return `ADMIN_EMAILS for ${slug} → ${list.join(', ')}; redeploy started.`
}

/** Stripe: the client's restricted key + webhook secret (SPEC: both-or-neither). Prints what the key needs. */
export async function setStripe(db: StudioDb, slug: string, secretKey: string, webhookSecret: string): Promise<string> {
  const { vc, project, brief } = await projectFor(db, slug)
  if (!secretKey.startsWith('rk_') && !secretKey.startsWith('sk_')) throw new Error('expected a Stripe secret or restricted key (rk_… / sk_…)')
  if (!webhookSecret.startsWith('whsec_')) throw new Error('expected a webhook signing secret (whsec_…)')
  await vc.setEnv(project.id, { STRIPE_SECRET_KEY: secretKey, STRIPE_WEBHOOK_SECRET: webhookSecret })
  await vc.redeploy(project.id)
  return `Stripe configured for ${slug}; redeploy started. Webhook endpoint: ${brief.siteUrl ?? ''}/api/site/stripe/webhook (event: checkout.session.completed, charge.refunded).`
}

export const STRIPE_KEY_INSTRUCTIONS = `Create a RESTRICTED key in the client's Stripe dashboard with:
  Checkout Sessions: write · Webhook Endpoints: write (only if you want the CLI to create the endpoint) · Events: read
Then add a webhook endpoint for <site>/api/site/stripe/webhook (checkout.session.completed, charge.refunded) and copy its signing secret.`

/** Upgrade one client to a core version: bump the pin, commit, push → Vercel migrates + deploys (SPEC §3). */
export async function upgradeClient(db: StudioDb, slug: string, version: string, opts: { workDir: string; authedRemote: string }): Promise<string> {
  const { spawnSync } = await import('node:child_process')
  const fs = await import('node:fs')
  const path = await import('node:path')
  const [brief] = await db.select().from(briefs).where(eq(briefs.slug, slug)).limit(1)
  if (!brief) throw new Error(`unknown slug ${slug}`)
  const run = (cmd: string, args: string[]) => {
    const r = spawnSync(cmd, args, { cwd: opts.workDir, stdio: 'pipe', encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${r.stderr.slice(-500)}`)
    return r.stdout
  }
  fs.rmSync(opts.workDir, { recursive: true, force: true })
  fs.mkdirSync(opts.workDir, { recursive: true })
  spawnSync('git', ['clone', '-q', '--depth', '1', opts.authedRemote, '.'], { cwd: opts.workDir, stdio: 'pipe' })
  const pkgPath = path.join(opts.workDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { dependencies: Record<string, string> }
  const before = pkg.dependencies['@studio/core']
  if (version === 'vendor') {
    // Vendored core (pre-npm): repack from the local checkout and replace the tarball.
    const coreDir = path.resolve(process.env['TEMPLATE_DIR'] ?? '../../template', '../packages/core')
    const vendor = path.join(opts.workDir, 'vendor')
    fs.rmSync(vendor, { recursive: true, force: true })
    fs.mkdirSync(vendor, { recursive: true })
    for (const [c, a] of [['pnpm', ['build']], ['pnpm', ['pack', '--pack-destination', vendor]]] as [string, string[]][]) {
      const r = spawnSync(c, a, { cwd: coreDir, stdio: 'pipe', encoding: 'utf8' })
      if (r.status !== 0) throw new Error(`${c} ${a.join(' ')}: ${r.stderr.slice(-300)}`)
    }
    const tgz = fs.readdirSync(vendor).find((f) => f.endsWith('.tgz'))!
    version = `file:./vendor/${tgz}`
  } else if (before === version) return `${slug} already on @studio/core@${version}`
  pkg.dependencies['@studio/core'] = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  run('git', ['config', 'user.email', process.env['GIT_AUTHOR_EMAIL'] ?? `${process.env['GH_ORG'] ?? 'studio'}@users.noreply.github.com`])
  run('git', ['config', 'user.name', process.env['GIT_AUTHOR_NAME'] ?? 'studio pipeline'])
  run('git', ['add', '-A'])
  run('git', ['commit', '-qm', `Upgrade @studio/core ${before} → ${version}`])
  run('git', ['push', '-q', 'origin', 'HEAD:main'])
  return `${slug}: @studio/core ${before} → ${version} pushed; Vercel will migrate and deploy.`
}
