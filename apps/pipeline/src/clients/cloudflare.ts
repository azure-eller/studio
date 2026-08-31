import { api } from './http'

const CF = 'https://api.cloudflare.com/client/v4'

export function cloudflare(token: string, zoneId: string) {
  const call = <T>(path: string, init: RequestInit & { expect?: number[] } = {}) => api<{ result: T; success: boolean }>('cloudflare', `${CF}${path}`, { ...init, token }).then((r) => r.result)
  return {
    /** CNAME <slug> → cname.vercel-dns.com, DNS-only (proxied: false — orange-cloud breaks Vercel TLS). Idempotent. */
    async upsertCname(name: string, target = 'cname.vercel-dns.com'): Promise<string> {
      const existing = await call<{ id: string }[]>(`/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(name)}`)
      const body = JSON.stringify({ type: 'CNAME', name, content: target, ttl: 300, proxied: false })
      if (existing[0]) {
        await call(`/zones/${zoneId}/dns_records/${existing[0].id}`, { method: 'PUT', body })
        return existing[0].id
      }
      const created = await call<{ id: string }>(`/zones/${zoneId}/dns_records`, { method: 'POST', body })
      return created.id
    },
    async deleteRecord(id: string): Promise<void> {
      await call(`/zones/${zoneId}/dns_records/${id}`, { method: 'DELETE', expect: [200, 404] })
    },
  }
}
