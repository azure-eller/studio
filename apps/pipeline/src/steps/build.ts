/**
 * build — `claude -p "/build"` in the checkout, usage recorded immediately, then the gates with ≤ FIX_RETRIES × /fix-build.
 * The model sees only the client's env (.env.local) and CLAUDE_CODE_OAUTH_TOKEN; no infra secret is in this step's env.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../config'
import { readLocalEnv, sh, type Run } from '../run'

interface ClaudeResult {
  num_turns?: number
  total_cost_usd?: number
  duration_ms?: number
  is_error?: boolean
  result?: string
}

const GATES: [string, string[]][] = [
  ['pnpm', ['typecheck']],
  ['pnpm', ['lint']],
  ['pnpm', ['build']],
  ['pnpm', ['check:site']],
]

async function claude(run: Run, prompt: string, maxTurns: number, token: string | undefined, clientEnv: Record<string, string>, model?: string): Promise<ClaudeResult> {
  const env: Record<string, string | undefined> = { ...clientEnv, CI: 'true', ...(token ? { CLAUDE_CODE_OAUTH_TOKEN: token } : {}), CLAUDECODE: undefined, CLAUDE_CODE_ENTRYPOINT: undefined }
  const r = await sh(run, 'claude', ['-p', prompt, '--dangerously-skip-permissions', '--output-format', 'json', '--no-session-persistence', '--max-turns', String(maxTurns), ...(model ? ['--model', model] : [])], { env, quiet: true })
  const jsonStart = r.out.lastIndexOf('\n{')
  const text = jsonStart >= 0 ? r.out.slice(jsonStart + 1) : r.out
  try {
    return JSON.parse(text) as ClaudeResult
  } catch {
    await run.log(`claude returned no JSON (exit ${r.code}): ${r.out.slice(-800)}`)
    return { is_error: true, result: r.out.slice(-800) }
  }
}

export async function runGates(run: Run, clientEnv: Record<string, string>): Promise<{ ok: boolean; output: string; retryable: boolean }> {
  for (const [cmd, args] of GATES) {
    const r = await sh(run, cmd, args, { env: clientEnv })
    if (r.code !== 0) {
      const gateFile = path.join(run.workDir, '.artifacts', 'gate-output.txt')
      const output = fs.existsSync(gateFile) && args[0] === 'check:site' ? fs.readFileSync(gateFile, 'utf8') : `${cmd} ${args.join(' ')} failed:\n${r.out.slice(-6000)}`
      // check:site exits 3 when every failure is on /admin — a core bug; asking the model to fix it only burns turns.
      return { ok: false, output, retryable: !(args[0] === 'check:site' && r.code === 3) }
    }
  }
  return { ok: true, output: '', retryable: true }
}

export async function build(run: Run): Promise<void> {
  const env = loadEnv('build')
  await run.setStep('build', 'building')
  const clientEnv = readLocalEnv(run.workDir)
  fs.mkdirSync(path.join(run.workDir, '.artifacts'), { recursive: true })

  const t0 = Date.now()
  const result = await claude(run, '/build', env.MAX_TURNS, env.CLAUDE_CODE_OAUTH_TOKEN, clientEnv, env.MODEL)
  // Usage goes to the build row before any gate runs, so a gate failure still leaves the numbers.
  await run.patch({ modelTurns: result.num_turns ?? null, modelCostUsd: result.total_cost_usd ?? null, modelDurationMs: result.duration_ms ?? Date.now() - t0 })
  // A model run that errored (auth, model id, rate limit…) must fail the build: the scaffold alone passes
  // every gate, so without this a dead model call ships a generic site and emails "done".
  if (result.is_error) throw new Error(`claude /build failed after ${result.num_turns ?? 0} turn(s): ${(result.result ?? '').slice(0, 1500)}`)
  await run.log(`/build: turns=${result.num_turns ?? '?'} cost=$${(result.total_cost_usd ?? 0).toFixed(2)} duration=${Math.round((result.duration_ms ?? 0) / 1000)}s error=${Boolean(result.is_error)}`)
  if (result.is_error && /401|unauthorized|invalid.*token|expired/i.test(result.result ?? '')) throw new Error('claude auth failed — regenerate CLAUDE_CODE_OAUTH_TOKEN')
  if (result.is_error && /429|rate limit|usage limit/i.test(result.result ?? '')) throw new Error('claude usage limit hit — the brief stays queued; re-dispatch later')

  await run.setStep('gates')
  let attempt = 0
  for (;;) {
    const g = await runGates(run, clientEnv)
    if (g.ok) break
    if (!g.retryable) {
      await run.log(`core-owned gate failure — not retrying:\n${g.output.slice(0, 3000)}`)
      throw new Error('gates failed (core-owned)')
    }
    attempt++
    if (attempt > env.FIX_RETRIES) {
      await run.log(`gates still failing after ${env.FIX_RETRIES} fix attempts:\n${g.output.slice(0, 3000)}`)
      throw new Error('gates failed')
    }
    await run.log(`gates failed; /fix-build attempt ${attempt}`)
    const fix = await claude(run, `/fix-build ${g.output.slice(0, 6000)}`, Math.max(40, Math.floor(env.MAX_TURNS / 2)), env.CLAUDE_CODE_OAUTH_TOKEN, clientEnv, env.MODEL)
    await run.patch({ fixAttempts: attempt, modelCostUsd: (run.build.modelCostUsd ?? 0) + (fix.total_cost_usd ?? 0), modelTurns: (run.build.modelTurns ?? 0) + (fix.num_turns ?? 0) })
  }
  await sh(run, 'git', ['add', '-A'])
  await sh(run, 'git', ['commit', '-q', '--allow-empty', '-m', 'Build site from brief'])
  await run.log('build complete; gates green')
}
