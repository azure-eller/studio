import { api, ApiError, sleep } from './http'

const V = 'https://api.vercel.com'

export interface VercelProject {
  id: string
  name: string
}
export interface VercelDeployment {
  uid: string
  readyState: 'QUEUED' | 'BUILDING' | 'INITIALIZING' | 'READY' | 'ERROR' | 'CANCELED'
  url: string
  createdAt: number
  meta?: Record<string, string>
}

/** `teamId` undefined = the personal (Hobby) scope. Client work needs a Pro team; testing does not. */
/**
 * Vercel only builds commits that carry a lockfile. provision pushes the bare template (no lockfile; pnpm on the build
 * image then fails with ERR_INVALID_THIS) and ship pushes the built site with one — so this skips the doomed provision
 * deploy instead of leaving a failed deployment as the project's latest. Exit 0 = skip.
 */
const IGNORE_COMMAND = '! test -f pnpm-lock.yaml'

export function vercel(token: string, teamId?: string | undefined) {
  const t = teamId ? `teamId=${encodeURIComponent(teamId)}` : ''
  const call = <T>(path: string, init: RequestInit & { expect?: number[] } = {}) => api<T>('vercel', t ? `${V}${path}${path.includes('?') ? '&' : '?'}${t}` : `${V}${path}`, { ...init, token })
  return {
    async findProject(name: string): Promise<VercelProject | null> {
      try {
        return await call<VercelProject>(`/v9/projects/${encodeURIComponent(name)}`)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
    /** Idempotent project settings for existing projects (createProject sets them for new ones). */
    async ensureSettings(projectId: string): Promise<void> {
      await call(`/v9/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ nodeVersion: '22.x', commandForIgnoringBuildStep: IGNORE_COMMAND }) })
    },
    async setBuildCommand(projectId: string, buildCommand: string): Promise<void> {
      await call(`/v9/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ buildCommand }) })
    },
    async createProject(name: string, repo: string, buildCommand: string): Promise<VercelProject> {
      const project = await call<VercelProject>('/v11/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          framework: 'nextjs',
          gitRepository: { type: 'github', repo },
          buildCommand,
          installCommand: 'pnpm install --frozen-lockfile=false',
          commandForIgnoringBuildStep: IGNORE_COMMAND,
        }),
      })
      // nodeVersion is not accepted on create; pin it after.
      await this.ensureSettings(project.id)
      return project
    },
    async deleteProject(id: string): Promise<void> {
      await call(`/v9/projects/${id}`, { method: 'DELETE', expect: [204, 404] })
    },
    /** Names of env vars set for production. Values are NOT readable back: Vercel returns an opaque blob for encrypted vars, so nothing in the pipeline ever depends on reading them. */
    async envKeys(projectId: string): Promise<Set<string>> {
      const { envs } = await call<{ envs: { key: string; target?: string[] }[] }>(`/v9/projects/${projectId}/env`)
      return new Set(envs.filter((v) => (v.target ?? []).includes('production')).map((v) => v.key))
    },
    /** Upserts env vars for production + preview. Values never appear in logs. */
    async setEnv(projectId: string, vars: Record<string, string>): Promise<void> {
      const body = Object.entries(vars).map(([key, value]) => ({ key, value, type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted', target: ['production', 'preview'] }))
      await call(`/v10/projects/${projectId}/env?upsert=true`, { method: 'POST', body: JSON.stringify(body) })
    },
    async addDomain(projectId: string, name: string): Promise<void> {
      await call(`/v10/projects/${projectId}/domains`, { method: 'POST', body: JSON.stringify({ name }), expect: [200, 201, 409] })
    },
    /** The project's Vercel-assigned *.vercel.app domain. May differ from `<name>.vercel.app` when that name is taken globally — always read it back, never guess. */
    async defaultDomain(projectId: string): Promise<string | null> {
      const { domains } = await call<{ domains: { name: string }[] }>(`/v9/projects/${projectId}/domains?limit=100`)
      const candidates = domains.filter((d) => d.name.endsWith('.vercel.app')).sort((a, b) => a.name.length - b.name.length)
      return candidates[0]?.name ?? null
    },
    async latestDeployment(projectId: string): Promise<VercelDeployment | null> {
      const { deployments } = await call<{ deployments: VercelDeployment[] }>(`/v6/deployments?projectId=${projectId}&limit=1&target=production`)
      return deployments[0] ?? null
    },
    /** Waits for the production deployment of a specific commit to reach READY (or fail). */
    async waitForDeployment(projectId: string, commitSha: string, timeoutMs = 20 * 60_000): Promise<VercelDeployment> {
      const t0 = Date.now()
      while (Date.now() - t0 < timeoutMs) {
        const { deployments } = await call<{ deployments: (VercelDeployment & { readySubstate?: string })[] }>(`/v6/deployments?projectId=${projectId}&limit=10&target=production`)
        const d = deployments.find((x) => x.meta?.['githubCommitSha'] === commitSha)
        if (d) {
          if (d.readyState === 'READY') return d
          if (d.readyState === 'ERROR' || d.readyState === 'CANCELED') throw new Error(`vercel deployment ${d.uid} ${d.readyState}`)
          if ((d.readyState as string) === 'BLOCKED') throw new Error(`vercel deployment ${d.uid} BLOCKED — the commit author is not a member of the Vercel account (set GIT_AUTHOR_EMAIL to the connected GitHub account)`)
        }
        await sleep(10_000)
      }
      throw new Error(`no READY deployment for commit ${commitSha.slice(0, 7)} within ${timeoutMs / 60000} min`)
    },
    async redeploy(projectId: string): Promise<void> {
      const d = await this.latestDeployment(projectId)
      if (!d) throw new Error('no deployment to redeploy')
      await call(`/v13/deployments`, { method: 'POST', body: JSON.stringify({ name: projectId, deploymentId: d.uid, target: 'production' }) })
    },
  }
}
