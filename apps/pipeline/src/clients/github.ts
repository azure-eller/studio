import { api, ApiError } from './http'

const GH = 'https://api.github.com'

export function github(token: string, org: string) {
  const call = <T>(path: string, init: RequestInit & { expect?: number[] } = {}) =>
    api<T>('github', `${GH}${path}`, { ...init, token, headers: { 'x-github-api-version': '2022-11-28', ...(init.headers ?? {}) } })
  return {
    async repoExists(name: string): Promise<boolean> {
      try {
        await call(`/repos/${org}/${name}`)
        return true
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return false
        throw e
      }
    },
    /** `org` may be an organisation or a personal account; GitHub uses different endpoints for each. */
    async createRepo(name: string, description: string): Promise<{ full_name: string; html_url: string; clone_url: string }> {
      const body = JSON.stringify({ name, description, private: true, has_issues: false, has_wiki: false, has_projects: false, auto_init: false })
      try {
        return await call(`/orgs/${org}/repos`, { method: 'POST', body })
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e
        return call(`/user/repos`, { method: 'POST', body })
      }
    },
    async deleteRepo(name: string): Promise<void> {
      await call(`/repos/${org}/${name}`, { method: 'DELETE', expect: [204, 404] })
    },
    /** Push URL with the token embedded; never log it. */
    authedRemote(name: string): string {
      return `https://x-access-token:${token}@github.com/${org}/${name}.git`
    },
    async dispatchWorkflow(repo: string, workflowFile: string, ref: string, inputs: Record<string, string>): Promise<void> {
      await call(`/repos/${org}/${repo}/actions/workflows/${workflowFile}/dispatches`, { method: 'POST', body: JSON.stringify({ ref, inputs }), expect: [204] })
    },
  }
}
