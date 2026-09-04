import { github } from '@studio/pipeline/src/clients/github'
import { env } from './env'

/**
 * Fire the build. Nobody approves anything after this. With ROUTINE_FIRE_URL + ROUTINE_TOKEN set, the build runs as a
 * Claude Code cloud routine (the routine's prompt reads the brief id out of the fire payload); otherwise the
 * build-site workflow on GitHub Actions is dispatched.
 */
export async function dispatchBuild(briefId: string): Promise<void> {
  const e = env()
  if (e.ROUTINE_FIRE_URL && e.ROUTINE_TOKEN) {
    const res = await fetch(e.ROUTINE_FIRE_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${e.ROUTINE_TOKEN}`,
        'anthropic-beta': 'experimental-cc-routine-2026-04-01',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text: `brief_id=${briefId}` }),
    })
    if (!res.ok) throw new Error(`routine fire failed: ${res.status} ${(await res.text()).slice(0, 300)}`)
    return
  }
  await github(e.GH_PAT, e.GH_ORG).dispatchWorkflow(e.STUDIO_REPO, 'build-site.yml', 'main', { brief_id: briefId })
}
