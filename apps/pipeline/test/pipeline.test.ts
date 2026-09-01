import { requiredEnvKeys } from '@studio/core'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadEnv, namesFor, stepEnv } from '../src/config'
import { briefs, builds } from '../src/db/schema'
import { clientEnv } from '../src/steps/provision'

const BRIEF = { admins: ['A@x.org', 'b@x.org'], contact: { email: 'client@x.org' }, org: { name: 'Acme' } }

describe('pipeline contracts', () => {
  it('names are derived from the slug only', () => {
    expect(namesFor('grace-church', 'studio.test')).toEqual({
      repo: 'grace-church',
      neonProject: 'grace-church',
      vercelProject: 'grace-church',
      r2Prefix: 'sites/grace-church',
      host: 'grace-church.studio.test',
      siteUrl: 'https://grace-church.studio.test',
    })
  })

  it('sets exactly the env core requires (SPEC §7) — no more, no less', () => {
    const vars = clientEnv({
      slug: 'acme',
      brief: BRIEF,
      studioDomain: 'studio.test',
      siteUrl: 'https://acme.studio.test',
      mediaBaseUrl: 'https://media.studio.test',
      emailFrom: 'Studio <noreply@studio.test>',
      resendApiKey: 're_x',
      r2: { accountId: 'acct', accessKeyId: 'ak', secretAccessKey: 'sk', bucket: 'studio-media' },
      db: { pooled: 'postgres://pooled', direct: 'postgres://direct' },
    })
    expect(Object.keys(vars).sort()).toEqual([...requiredEnvKeys].sort())
    expect(vars['ADMIN_EMAILS']).toBe('a@x.org,b@x.org')
    expect(vars['R2_PREFIX']).toBe('sites/acme')
    expect(vars['NEXT_PUBLIC_SITE_URL']).toBe('https://acme.studio.test')
    expect(vars['EMAIL_REPLY_TO']).toBe('client@x.org')
    expect(vars['AUTH_SECRET']).toHaveLength(64)
    expect(vars['DATABASE_URL_UNPOOLED']).toBe('postgres://direct')
  })

  it('the build step never requires an infra secret', () => {
    const buildKeys = Object.keys(stepEnv.build.shape)
    for (const k of ['GH_PAT', 'VERCEL_TOKEN', 'NEON_API_KEY', 'CF_API_TOKEN', 'R2_SECRET_ACCESS_KEY', 'RESEND_API_KEY']) expect(buildKeys).not.toContain(k)
    expect(buildKeys).toContain('CLAUDE_CODE_OAUTH_TOKEN')
    const provisionKeys = Object.keys(stepEnv.provision.shape)
    expect(provisionKeys).not.toContain('CLAUDE_CODE_OAUTH_TOKEN')
  })

  it('loadEnv reports every missing variable for a step', () => {
    expect(() => loadEnv('ship', {})).toThrow(/GH_PAT[\s\S]*VERCEL_TOKEN/)
    expect(loadEnv('scaffold', { STUDIO_DATABASE_URL: 'x', STUDIO_DOMAIN: 'studio.test', TEMPLATE_DIR: '/t', DESIGNER_EMAIL: 'd@x.org', EMAIL_FROM: 'S <s@x.org>', MEDIA_BASE_URL: 'https://m.x' }).DRY_RUN).toBe(false)
  })

  it('studio migrations apply and enforce the brief status set', async () => {
    const db = drizzle(new PGlite(), { schema: { briefs, builds } })
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../migrations') })
    const [b] = await db.insert(briefs).values({ slug: 'acme', clientEmail: 'c@x.org', status: 'queued', brief: {} }).returning()
    expect(b!.status).toBe('queued')
    await expect(db.insert(briefs).values({ slug: 'bad', clientEmail: 'c@x.org', status: 'bogus' as never })).rejects.toThrow()
    const [run] = await db.insert(builds).values({ briefId: b!.id }).returning()
    expect(run!.status).toBe('running')
    expect(run!.fixAttempts).toBe(0)
  })
})
