import { desc, eq, sql } from 'drizzle-orm'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createStudioDb, type StudioDb } from './db/client'
import { briefs, builds, type Brief, type BriefStatus, type Build, type BuildStep } from './db/schema'

export interface Run {
  db: StudioDb
  brief: Brief
  build: Build
  workDir: string
  log(line: string): Promise<void>
  setStep(step: BuildStep, briefStatus?: BriefStatus): Promise<void>
  patch(values: Partial<typeof builds.$inferInsert>): Promise<void>
  finish(status: 'done' | 'failed', error?: string): Promise<void>
}

/** Client checkout for this brief; persists across steps within one job. */
export function workDirFor(slug: string): string {
  return process.env['WORK_DIR'] ?? path.join(os.tmpdir(), 'studio-build', slug)
}

/** Opens (or resumes) the build for a brief. A running build is resumed so a retried job continues where it stopped. */
export async function openRun(studioDbUrl: string, briefId: string): Promise<Run> {
  const db = createStudioDb(studioDbUrl)
  const brief = (await db.select().from(briefs).where(eq(briefs.id, briefId)).limit(1))[0]
  if (!brief) throw new Error(`brief ${briefId} not found`)
  let build = (await db.select().from(builds).where(eq(builds.briefId, briefId)).orderBy(desc(builds.startedAt)).limit(1))[0]
  if (!build || build.status !== 'running') {
    // Provisioning is idempotent by slug, but the identifiers live on the build row: carry them into the new run.
    const prev = (await db.select().from(builds).where(eq(builds.briefId, briefId)).orderBy(desc(builds.startedAt)).limit(5)).find((b) => b.vercelProjectId || b.neonProjectId)
    build = (
      await db
        .insert(builds)
        .values({ briefId, repoFullName: prev?.repoFullName ?? null, neonProjectId: prev?.neonProjectId ?? null, vercelProjectId: prev?.vercelProjectId ?? null, dnsRecordId: prev?.dnsRecordId ?? null })
        .returning()
    )[0]!
  }
  const workDir = workDirFor(brief.slug)
  const run: Run = {
    db,
    brief,
    build,
    workDir,
    async log(line) {
      const stamped = `[${new Date().toISOString()}] ${redact(line)}`
      console.log(stamped)
      await db.update(builds).set({ log: sql`${builds.log} || ${stamped + '\n'}` }).where(eq(builds.id, build.id))
    },
    async setStep(step, briefStatus) {
      await db.update(builds).set({ step }).where(eq(builds.id, build.id))
      if (briefStatus) await db.update(briefs).set({ status: briefStatus }).where(eq(briefs.id, briefId))
      await run.log(`── ${step}`)
    },
    async patch(values) {
      await db.update(builds).set(values).where(eq(builds.id, build.id))
      Object.assign(build, values)
    },
    async finish(status, error) {
      await db.update(builds).set({ status, error: error ?? null, finishedAt: new Date() }).where(eq(builds.id, build.id))
      await db.update(briefs).set({ status: status === 'done' ? 'done' : 'failed' }).where(eq(briefs.id, briefId))
    },
  }
  return run
}

/** Runs a command in the checkout, streaming output into the build log. Secrets go through `env`, never argv. */
export function sh(run: Run, cmd: string, args: string[], opts: { env?: Record<string, string | undefined>; cwd?: string; input?: string; quiet?: boolean } = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    // An `undefined` value in opts.env removes the variable (e.g. CLAUDECODE, so a nested `claude -p` starts clean).
    const env: Record<string, string> = {}
    for (const [k, v] of Object.entries({ ...process.env, ...opts.env })) if (v !== undefined) env[k] = v
    const child = spawn(cmd, args, { cwd: opts.cwd ?? run.workDir, env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    const onData = (d: Buffer) => {
      const s = d.toString()
      out += s
      if (!opts.quiet) process.stdout.write(s)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    if (opts.input !== undefined) child.stdin.write(opts.input)
    child.stdin.end()
    child.on('close', (code) => resolve({ code: code ?? 1, out }))
  })
}

/** Strips credentials embedded in URLs (git remotes) and anything that looks like a token before it reaches a log. */
export function redact(s: string): string {
  return s
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g, '$1***@')
    .replace(/\b(gh[pousr]_|github_pat_|vcp_|napi_|cfut_|cfat_|re_|whsec_|sk_live_|rk_live_|sk_test_|rk_test_)[A-Za-z0-9_-]{6,}/g, '$1***')
}

export async function shOrThrow(run: Run, cmd: string, args: string[], opts: Parameters<typeof sh>[3] = {}): Promise<string> {
  const r = await sh(run, cmd, args, opts)
  if (r.code !== 0) {
    await run.log(redact(`${cmd} ${args.join(' ')} exited ${r.code}\n${r.out.slice(-4000)}`))
    throw new Error(`${cmd} ${args[0] ?? ''} failed (${r.code})`)
  }
  return r.out
}

/** `.env.local` in the checkout carries the client's runtime env between steps (gitignored by the template). */
export function readLocalEnv(workDir: string): Record<string, string> {
  const file = path.join(workDir, '.env.local')
  if (!fs.existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]!] = m[2]!.replace(/^"(.*)"$/, '$1')
  }
  return out
}
export function writeLocalEnv(workDir: string, vars: Record<string, string>): void {
  fs.writeFileSync(path.join(workDir, '.env.local'), Object.entries(vars).map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`).join('\n') + '\n', { mode: 0o600 })
}
