#!/usr/bin/env tsx
/**
 * pipeline <provision|scaffold|harvest|build|ship|notify|run|destroy> <brief_id>
 * pipeline queue <brief.json> <client-email>     — insert a brief (local end-to-end without the intake app)
 * pipeline invite <email> [note]                 — create an invite link
 * pipeline status [brief_id]                     — list briefs / show a build log
 * pipeline add-domain <slug> <domain>            — go-live: attach the client's domain (lifts noindex)
 * pipeline set-admins <slug> <email,email>       — go-live: replace ADMIN_EMAILS
 * pipeline set-stripe <slug> <rk_…> <whsec_…>    — go-live: client's own Stripe keys
 * pipeline upgrade-client <slug> <version>       — bump the core pin; Vercel migrates + deploys
 * pipeline bootstrap                             — set up / verify the whole studio from apps/pipeline/.env (idempotent)
 */
import { desc, eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createStudioDb } from './db/client'
import { briefs, builds, invites } from './db/schema'
import { openRun } from './run'
import { build } from './steps/build'
import { destroy } from './steps/destroy'
import { harvest } from './steps/harvest'
import { notify } from './steps/notify'
import { provision } from './steps/provision'
import { scaffold } from './steps/scaffold'
import { ship } from './steps/ship'
import { addDomain, setAdmins, setStripe, STRIPE_KEY_INSTRUCTIONS, upgradeClient } from './steps/golive'
import { bootstrap } from './steps/bootstrap'
import path from 'node:path'
import { github } from './clients/github'
import { loadEnv } from './config'
import { workDirFor } from './run'

const [cmd, a, b] = process.argv.slice(2)
const studioUrl = () => {
  const u = process.env['STUDIO_DATABASE_URL']
  if (!u) throw new Error('STUDIO_DATABASE_URL is required')
  return u
}

async function step(name: string, briefId: string | undefined): Promise<void> {
  if (!briefId) throw new Error(`usage: pipeline ${name} <brief_id>`)
  const run = await openRun(studioUrl(), briefId)
  try {
    switch (name) {
      case 'provision':
        await provision(run)
        break
      case 'scaffold':
        await scaffold(run)
        break
      case 'harvest':
        await harvest(run)
        break
      case 'build':
        await build(run)
        break
      case 'ship':
        await ship(run)
        await run.finish('done')
        break
      case 'notify':
        await notify(run, run.build.status === 'failed' || process.argv.includes('--failed') ? 'failed' : 'done', run.build.error ?? undefined)
        break
      case 'run':
        await provision(run)
        await scaffold(run)
        await harvest(run)
        await build(run)
        await ship(run)
        await run.finish('done')
        await notify(run, 'done')
        break
      case 'destroy':
        await destroy(run, { keepMedia: process.argv.includes('--keep-media') })
        break
      default:
        throw new Error(`unknown step ${name}`)
    }
  } catch (e) {
    const msg = (e as Error).message
    await run.log(`FAILED: ${msg}`)
    await run.finish('failed', msg)
    if (name === 'run') await notify(run, 'failed', msg).catch((n: Error) => console.error('notify failed:', n.message))
    process.exitCode = 1
  }
}

async function main(): Promise<void> {
  switch (cmd) {
    case 'queue': {
      if (!a || !b) throw new Error('usage: pipeline queue <brief.json> <client-email>')
      const db = createStudioDb(studioUrl())
      const brief = JSON.parse(fs.readFileSync(a, 'utf8')) as { slug: string }
      const [row] = await db
        .insert(briefs)
        .values({ slug: brief.slug, clientEmail: b, status: 'queued', brief })
        .onConflictDoUpdate({ target: briefs.slug, set: { brief, status: 'queued', clientEmail: b } })
        .returning({ id: briefs.id })
      console.log(row!.id)
      return
    }
    case 'invite': {
      if (!a) throw new Error('usage: pipeline invite <email> [note]')
      const db = createStudioDb(studioUrl())
      const token = crypto.randomBytes(24).toString('base64url')
      await db.insert(invites).values({ token, email: a, note: b ?? null, expiresAt: new Date(Date.now() + 30 * 86_400_000) })
      console.log(`${process.env['INTAKE_URL'] ?? 'https://intake.example'}/start/${token}`)
      return
    }
    case 'status': {
      const db = createStudioDb(studioUrl())
      if (a) {
        const [bl] = await db.select().from(builds).where(eq(builds.briefId, a)).orderBy(desc(builds.startedAt)).limit(1)
        console.log(bl ? `${bl.status} @ ${bl.step}\n${bl.log}` : 'no builds')
      } else {
        for (const r of await db.select().from(briefs).orderBy(desc(briefs.createdAt)).limit(50)) console.log(`${r.id}  ${r.status.padEnd(12)} ${r.slug.padEnd(24)} ${r.siteUrl ?? ''}`)
      }
      return
    }
    case 'add-domain': {
      if (!a || !b) throw new Error('usage: pipeline add-domain <slug> <domain>')
      console.log(await addDomain(createStudioDb(studioUrl()), a, b))
      return
    }
    case 'set-admins': {
      if (!a || !b) throw new Error('usage: pipeline set-admins <slug> <email,email>')
      console.log(await setAdmins(createStudioDb(studioUrl()), a, b.split(',')))
      return
    }
    case 'set-stripe': {
      const c = process.argv[5]
      if (!a || !b || !c) throw new Error(`usage: pipeline set-stripe <slug> <rk_…> <whsec_…>\n${STRIPE_KEY_INSTRUCTIONS}`)
      console.log(await setStripe(createStudioDb(studioUrl()), a, b, c))
      return
    }
    case 'upgrade-client': {
      if (!a || !b) throw new Error('usage: pipeline upgrade-client <slug> <version>')
      const env = loadEnv('ship')
      console.log(await upgradeClient(createStudioDb(studioUrl()), a, b, { workDir: workDirFor(`${a}-upgrade`), authedRemote: github(env.GH_PAT, env.GH_ORG).authedRemote(a) }))
      return
    }
    case 'bootstrap': {
      process.exitCode = await bootstrap(path.resolve(import.meta.dirname, '../../..'))
      return
    }
    case 'provision':
    case 'scaffold':
    case 'build':
    case 'ship':
    case 'notify':
    case 'run':
    case 'destroy':
      await step(cmd, a)
      return
    default:
      console.error('usage: pipeline <provision|scaffold|build|ship|notify|run|destroy> <brief_id> | queue <brief.json> <email> | invite <email> | status [brief_id]')
      process.exitCode = 2
  }
}
await main()
