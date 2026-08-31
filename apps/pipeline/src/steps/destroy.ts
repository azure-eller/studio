/** destroy — tear down everything provisioned for a slug (failed builds, tests). Never called by the workflow itself. */
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import { cloudflare } from '../clients/cloudflare'
import { github } from '../clients/github'
import { neon } from '../clients/neon'
import { vercel } from '../clients/vercel'
import { loadEnv, namesFor } from '../config'
import { briefs, builds } from '../db/schema'
import type { Run } from '../run'

export async function destroy(run: Run, opts: { keepMedia?: boolean } = {}): Promise<void> {
  const env = loadEnv('destroy')
  const n = namesFor(run.brief.slug, env.STUDIO_DOMAIN)
  await run.log(`destroy ${run.brief.slug}`)
  if (env.DRY_RUN) {
    await run.log('DRY RUN — would delete vercel project, neon project, DNS record, repo and R2 prefix')
    return
  }
  const vc = vercel(env.VERCEL_TOKEN, env.VERCEL_TEAM_ID)
  const vp = await vc.findProject(n.vercelProject)
  if (vp) await vc.deleteProject(vp.id)
  const ne = neon(env.NEON_API_KEY, { orgId: env.NEON_ORG_ID, region: env.NEON_REGION })
  const np = await ne.findProject(n.neonProject)
  if (np) await ne.deleteProject(np.id)
  if (run.build.dnsRecordId) await cloudflare(env.CF_API_TOKEN, env.CF_ZONE_ID).deleteRecord(run.build.dnsRecordId)
  await github(env.GH_PAT, env.GH_ORG).deleteRepo(n.repo)
  if (!opts.keepMedia) {
    const s3 = new S3Client({ region: 'auto', endpoint: `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`, forcePathStyle: true, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } })
    let token: string | undefined
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET, Prefix: `${n.r2Prefix}/`, ContinuationToken: token }))
      const keys = (page.Contents ?? []).map((o) => ({ Key: o.Key! }))
      if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket: env.R2_BUCKET, Delete: { Objects: keys } }))
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
  }
  await run.db.update(builds).set({ status: 'failed', error: 'destroyed', finishedAt: new Date() }).where(eq(builds.id, run.build.id))
  await run.db.update(briefs).set({ status: 'draft', siteUrl: null, repoUrl: null }).where(eq(briefs.id, run.brief.id))
  await run.log('destroyed')
}
