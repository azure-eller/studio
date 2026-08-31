import { api, sleep } from './http'

const NEON = 'https://console.neon.tech/api/v2'

interface NeonProject {
  id: string
  name: string
}
interface ConnectionUris {
  pooled: string
  direct: string
}

export function neon(apiKey: string, opts: { orgId?: string | undefined; region: string }) {
  const call = <T>(path: string, init: RequestInit & { expect?: number[] } = {}) => api<T>('neon', `${NEON}${path}`, { ...init, token: apiKey })
  return {
    async findProject(name: string): Promise<NeonProject | null> {
      const q = opts.orgId ? `?org_id=${opts.orgId}&limit=400` : '?limit=400'
      const { projects } = await call<{ projects: NeonProject[] }>(`/projects${q}`)
      return projects.find((p) => p.name === name) ?? null
    },
    async createProject(name: string): Promise<NeonProject> {
      const body = { project: { name, region_id: opts.region, pg_version: 17, ...(opts.orgId ? { org_id: opts.orgId } : {}) } }
      const { project } = await call<{ project: NeonProject }>('/projects', { method: 'POST', body: JSON.stringify(body) })
      return project
    },
    async deleteProject(id: string): Promise<void> {
      await call(`/projects/${id}`, { method: 'DELETE', expect: [200, 404] })
    },
    /** Pooled + direct URIs for the default branch/database/role (SPEC §7: DATABASE_URL and DATABASE_URL_UNPOOLED). */
    async connectionUris(projectId: string): Promise<ConnectionUris> {
      for (let i = 0; i < 20; i++) {
        const { branches } = await call<{ branches: { id: string; default?: boolean; primary?: boolean }[] }>(`/projects/${projectId}/branches`)
        const branch = branches.find((b) => b.default || b.primary) ?? branches[0]
        if (!branch) {
          await sleep(1500)
          continue
        }
        const { databases } = await call<{ databases: { name: string; owner_name: string }[] }>(`/projects/${projectId}/branches/${branch.id}/databases`)
        const db = databases[0]
        if (!db) {
          await sleep(1500)
          continue
        }
        const uri = (pooled: boolean) =>
          call<{ uri: string }>(`/projects/${projectId}/connection_uri?branch_id=${branch.id}&database_name=${encodeURIComponent(db.name)}&role_name=${encodeURIComponent(db.owner_name)}&pooled=${pooled}`).then((r) => r.uri)
        return { pooled: await uri(true), direct: await uri(false) }
      }
      throw new Error(`neon project ${projectId}: branch/database not ready`)
    },
  }
}
