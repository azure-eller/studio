/** ship — push main, wait for the Vercel production deployment, smoke every route from the sitemap. */
import { eq } from 'drizzle-orm'
import { vercel } from '../clients/vercel'
import { loadEnv, namesFor } from '../config'
import { briefs } from '../db/schema'
import { shOrThrow, studioRoot, type Run } from '../run'
import { github } from '../clients/github'

export async function ship(run: Run): Promise<void> {
  const env = loadEnv('ship')
  await run.setStep('ship', 'deploying')
  const n = namesFor(run.brief.slug, env.STUDIO_DOMAIN)
  if (env.DRY_RUN) {
    await run.log(`DRY RUN — would push and wait for ${n.siteUrl}`)
    return
  }
  const gh = github(env.GH_PAT, env.GH_ORG)
  const mono = env.STUDIO_LAYOUT === 'monorepo'
  let sha: string
  if (mono) {
    // Push the site's branch, open the PR, merge it: GitHub's proxy accepts all three, and a rebase keeps the
    // pipeline's commit author on main, which Vercel checks before it builds.
    const slug = run.brief.slug
    const branch = `claude/site-${slug}`
    await shOrThrow(run, 'git', ['push', '-q', '--force', '-u', 'origin', branch], { cwd: studioRoot(), quiet: true })
    const org = (run.brief.brief as { org?: { name?: string } } | null)?.org?.name ?? slug
    const pr = await gh.ensurePr(env.STUDIO_REPO, branch, 'main', `Site: ${org}`, `Built by the studio pipeline for brief ${run.brief.id}. Lives in sites/${slug}.`)
    sha = await gh.mergePr(env.STUDIO_REPO, pr.number)
    await run.log(`merged ${pr.html_url} into main (${sha.slice(0, 7)}); waiting for Vercel`)
  } else {
    await shOrThrow(run, 'git', ['push', '-q', '--force', gh.authedRemote(n.repo), 'main'], { quiet: true })
    sha = (await shOrThrow(run, 'git', ['rev-parse', 'HEAD'], { quiet: true })).trim()
    await run.log(`pushed main (${sha.slice(0, 7)}); waiting for Vercel`)
  }
  if (!run.build.vercelProjectId) throw new Error('no vercelProjectId on build (provision did not run?)')
  const vc = vercel(env.VERCEL_TOKEN, env.VERCEL_TEAM_ID)
  const dep = await vc.waitForDeployment(run.build.vercelProjectId, sha)
  await run.patch({ vercelDeploymentId: dep.uid })
  await run.log(`deployment ${dep.uid} READY`)

  // On vercel.app the assigned domain can differ from the computed <slug>.vercel.app — read it back.
  let siteUrl = n.siteUrl
  if (env.STUDIO_DOMAIN === 'vercel.app') {
    const dd = await vc.defaultDomain(run.build.vercelProjectId)
    if (dd) siteUrl = `https://${dd}`
  }

  await run.setStep('ship', 'verifying')
  await waitForHost(run, siteUrl)
  const routes = await routesFromSitemap(siteUrl)
  const bad: string[] = []
  for (const r of routes) {
    const res = await fetch(`${siteUrl}${r}`, { redirect: 'manual' }).catch(() => null)
    if (!res || res.status !== 200) bad.push(`${r} → ${res?.status ?? 'no response'}`)
  }
  if (bad.length) throw new Error(`smoke failed on ${bad.length}/${routes.length} routes:\n${bad.join('\n')}`)
  await run.log(`smoke ok: ${routes.length} routes return 200 on ${siteUrl}`)
  const repoUrl = mono ? `https://github.com/${env.GH_ORG}/${env.STUDIO_REPO}/tree/main/sites/${run.brief.slug}` : `https://github.com/${run.build.repoFullName ?? `${env.GH_ORG}/${n.repo}`}`
  await run.db.update(briefs).set({ siteUrl, repoUrl }).where(eq(briefs.id, run.brief.id))
}

/** A brand-new subdomain needs DNS propagation + certificate issuance before it serves anything; poll until it does. */
export async function waitForHost(run: Run, siteUrl: string, timeoutMs = 15 * 60_000): Promise<void> {
  const t0 = Date.now()
  let lastErr = ''
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(`${siteUrl}/robots.txt`, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
      if (res.status < 500) return
      lastErr = `HTTP ${res.status}`
    } catch (e) {
      lastErr = (e as Error).message
    }
    await new Promise((r) => setTimeout(r, 15_000))
  }
  throw new Error(`${siteUrl} did not come up within ${timeoutMs / 60000} min (${lastErr})`)
}

export async function routesFromSitemap(siteUrl: string): Promise<string[]> {
  const set = new Set<string>(['/'])
  try {
    const xml = await (await fetch(`${siteUrl}/sitemap.xml`)).text()
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) set.add(new URL(m[1]!).pathname)
  } catch {
    /* sitemap missing → home only */
  }
  return [...set]
}
