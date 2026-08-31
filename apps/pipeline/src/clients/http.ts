export class ApiError extends Error {
  constructor(
    public service: string,
    public status: number,
    public body: string,
  ) {
    super(`${service} ${status}: ${body.slice(0, 300)}`)
  }
}

export async function api<T = unknown>(service: string, url: string, init: RequestInit & { token: string; tokenScheme?: string; expect?: number[] }): Promise<T> {
  const { token, tokenScheme = 'Bearer', expect = [200, 201, 202, 204], ...rest } = init
  const res = await fetch(url, {
    ...rest,
    headers: { authorization: `${tokenScheme} ${token}`, 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'studio-pipeline', ...(rest.headers ?? {}) },
  })
  const text = await res.text()
  if (!expect.includes(res.status)) throw new ApiError(service, res.status, text)
  return (text ? JSON.parse(text) : undefined) as T
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
