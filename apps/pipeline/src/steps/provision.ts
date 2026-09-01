/**
 * provision — GitHub repo · Neon project · Vercel project + env + domain · Cloudflare CNAME · checkout.
 * Idempotent by slug: every lookup happens before every create, and identifiers are stored on the build row.
 */
import { requiredEnvKeys } from '@studio/core'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { cloudflare } from '../clients/cloudflare'
import { github } from '../clients/github'
import { neon } from '../clients/neon'
import { vercel } from '../clients/vercel'
import { loadEnv, namesFor } from '../config'
import { shOrThrow, writeLocalEnv, type Run } from '../run'

type BriefJson = { admins: string[]; contact: { email: string }; org: { name: string } }

/** The exact env a client site needs — asserted against core's contract so the two can never drift (SPEC §7). */
export function clientEnv(opts: {
  slug: string
  brief: BriefJson
  studioDomain: string
  /** The real public URL — on vercel.app the assigned domain can differ from `<slug>.vercel.app`. */
  siteUrl: string
  mediaBaseUrl: string
  emailFrom: string
  resendApiKey: string
  r2: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }
  db: { pooled: string; direct: string }
}): Record<string, string> {
  const n = namesFor(opts.slug, opts.studioDomain)
  const vars: Record<string, string> = {
    DATABASE_URL: opts.db.pooled,
    DATABASE_URL_UNPOOLED: opts.db.direct,
    AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    ADMIN_EMAILS: opts.brief.admins.map((e) => e.toLowerCase()).join(','),
    NEXT_PUBLIC_SITE_URL: opts.siteUrl,
    RESEND_API_KEY: opts.resendApiKey,
    EMAIL_FROM: opts.emailFrom,
    EMAIL_REPLY_TO: opts.brief.contact.email,
    R2_ACCOUNT_ID: opts.r2.accountId,
    R2_ACCESS_KEY_ID: opts.r2.accessKeyId,
    R2_SECRET_ACCESS_KEY: opts.r2.secretAccessKey,
    R2_BUCKET: opts.r2.bucket,
    R2_PREFIX: n.r2Prefix,
    NEXT_PUBLIC_MEDIA_BASE_URL: opts.mediaBaseUrl,
    STUDIO_DOMAIN: opts.studioDomain,
  }
  const want = [...requiredEnvKeys].sort()
  const have = Object.keys(vars).sort()
  if (JSON.stringify(want) !== JSON.stringify(have)) throw new Error(`clientEnv drift: core requires ${want.join(',')} but pipeline sets ${have.join(',')}`)
  return vars
}

/**
 * Until @studio/core is published to npm, each client repo carries a packed tarball of it in vendor/ and
 * depends on it by file path. Vercel installs it like any dependency. Swap for a version pin at release time.
 */
async function vendorCore(run: Run, templateDir: string): Promise<void> {
  const coreDir = path.resolve(templateDir, '../packages/core')
  const pkgPath = path.join(run.workDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { dependencies: Record<string, string> }
  if (!fs.existsSync(coreDir) || /^\d/.test(pkg.dependencies['@studio/core'] ?? '') === false) {
    /* no local core checkout or already a file: pin — nothing to do */
  }
  if (!fs.existsSync(coreDir)) return
  const vendor = path.join(run.workDir, 'vendor')
  fs.mkdirSync(vendor, { recursive: true })
  await shOrThrow(run, 'pnpm', ['build'], { cwd: coreDir, quiet: true })
  await shOrThrow(run, 'pnpm', ['pack', '--pack-destination', vendor], { cwd: coreDir, quiet: true })
  const tgz = fs.readdirSync(vendor).find((f) => f.startsWith('studio-core-') && f.endsWith('.tgz'))
  if (!tgz) throw new Error('core tarball not produced')
  pkg.dependencies['@studio/core'] = `file:./vendor/${tgz}`
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  await run.log(`vendored @studio/core as vendor/${tgz}`)
}

export async function provision(run: Run): Promise<void> {
  const env = loadEnv('provision')
  const brief = run.brief.brief as BriefJson | null
  if (!brief) throw new Error('brief has no content')
  const slug = run.brief.slug
  const n = namesFor(slug, env.STUDIO_DOMAIN)
  await run.setStep('provision', 'provisioning')

  if (env.DRY_RUN) {
    await run.log(`DRY RUN — would create repo ${env.GH_ORG}/${n.repo}, neon ${n.neonProject}, vercel ${n.vercelProject} (${n.host}), CNAME ${n.host}`)
    return
  }

  // 1. GitHub
  const gh = github(env.GH_PAT, env.GH_ORG)
  const repoFullName = `${env.GH_ORG}/${n.repo}`
  if (!(await gh.repoExists(n.repo))) {
    await gh.createRepo(n.repo, `${brief.org.name} — built by the studio pipeline`)
    await run.log(`created repo ${repoFullName}`)
  } else await run.log(`repo ${repoFullName} exists`)
  await run.patch({ repoFullName })

  // 2. Neon
  const ne = neon(env.NEON_API_KEY, { orgId: env.NEON_ORG_ID, region: env.NEON_REGION })
  let project = await ne.findProject(n.neonProject)
  if (!project) {
    project = await ne.createProject(n.neonProject)
    await run.log(`created neon project ${project.id}`)
  } else await run.log(`neon project ${project.id} exists`)
  await run.patch({ neonProjectId: project.id })
  const uris = await ne.connectionUris(project.id)

  // 3. Vercel
  const vc = vercel(env.VERCEL_TOKEN, env.VERCEL_TEAM_ID)
  let vproject = await vc.findProject(n.vercelProject)
  if (!vproject) {
    vproject = await vc.createProject(n.vercelProject, repoFullName, 'pnpm db:migrate && next build')
    await run.log(`created vercel project ${vproject.id}`)
  } else await run.log(`vercel project ${vproject.id} exists`)
  await vc.ensureSettings(vproject.id)
  await run.patch({ vercelProjectId: vproject.id })
  // A rebuild must not log everyone out, drop admins added at go-live, or revert a custom domain — so on an
  // existing project these three are never overwritten (their values can't be read back from Vercel anyway).
  // With no studio zone (STUDIO_DOMAIN=vercel.app) the site serves on the project's Vercel-assigned
  // domain, which can differ from <slug>.vercel.app when that name is taken globally — read it back.
  let siteUrl = n.siteUrl
  if (env.STUDIO_DOMAIN === 'vercel.app') {
    const dd = await vc.defaultDomain(vproject.id)
    if (dd) siteUrl = `https://${dd}`
  }
  const existing = await vc.envKeys(vproject.id)
  const vars = clientEnv({
    slug,
    brief,
    studioDomain: env.STUDIO_DOMAIN,
    siteUrl,
    mediaBaseUrl: env.MEDIA_BASE_URL,
    emailFrom: env.EMAIL_FROM,
    resendApiKey: env.RESEND_API_KEY,
    r2: { accountId: env.CF_ACCOUNT_ID, accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, bucket: env.R2_BUCKET },
    db: uris,
  })
  for (const k of ['AUTH_SECRET', 'ADMIN_EMAILS', 'NEXT_PUBLIC_SITE_URL'] as const) if (existing.has(k)) delete vars[k]
  await vc.setEnv(vproject.id, vars)

  // 4. Studio subdomain + DNS — only when the studio has a domain of its own. On vercel.app the
  // project already serves at its assigned default domain and there is no zone to write records in.
  if (env.STUDIO_DOMAIN === 'vercel.app' || !env.CF_ZONE_ID) {
    await run.log(`vercel env set (${Object.keys(vars).length} vars); site will serve at ${siteUrl}`)
  } else {
    await vc.addDomain(vproject.id, n.host)
    await run.log(`vercel env set (${Object.keys(vars).length} vars) and domain ${n.host} added`)
    const cf = cloudflare(env.CF_API_TOKEN, env.CF_ZONE_ID)
    const dnsRecordId = await cf.upsertCname(n.host)
    await run.patch({ dnsRecordId })
    await run.log(`CNAME ${n.host} → cname.vercel-dns.com (DNS only)`)
  }

  // 5. Checkout: template + brief.json, pushed to main. The client DB env goes to .env.local for the next steps.
  fs.rmSync(run.workDir, { recursive: true, force: true })
  fs.mkdirSync(run.workDir, { recursive: true })
  fs.cpSync(env.TEMPLATE_DIR, run.workDir, { recursive: true, filter: (src) => !/\/(node_modules|\.next|\.artifacts|fixtures)(\/|$)/.test(src) })
  fs.writeFileSync(path.join(run.workDir, 'brief.json'), JSON.stringify(brief, null, 2) + '\n')
  await vendorCore(run, env.TEMPLATE_DIR)
  writeLocalEnv(run.workDir, vars)
  await shOrThrow(run, 'git', ['init', '-q', '-b', 'main'])
  await shOrThrow(run, 'git', ['config', 'user.email', env.GIT_AUTHOR_EMAIL ?? `${env.GH_ORG}@users.noreply.github.com`])
  await shOrThrow(run, 'git', ['config', 'user.name', env.GIT_AUTHOR_NAME])
  await shOrThrow(run, 'git', ['add', '-A'])
  await shOrThrow(run, 'git', ['commit', '-q', '-m', `Initial site for ${brief.org.name} from template`])
  await shOrThrow(run, 'git', ['remote', 'add', 'origin', gh.authedRemote(n.repo)], { quiet: true })
  await shOrThrow(run, 'git', ['push', '-q', '--force', 'origin', 'main'], { quiet: true })
  await run.log(`pushed template + brief to ${repoFullName}@main`)
}
