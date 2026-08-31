export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: { path: (string | number)[]; message: string }[],
  ) {
    super(message)
  }
}

export function createApi(apiBase: string) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method, credentials: 'same-origin' }
    if (body !== undefined) {
      init.headers = { 'content-type': 'application/json' }
      init.body = JSON.stringify(body)
    }
    const res = await fetch(`${apiBase}/${path}`, init)
    const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: ApiError['issues'] } & T
    if (!res.ok) throw new ApiError(res.status, data.error ?? `http_${res.status}`, data.issues)
    return data
  }
  return {
    get: <T>(path: string) => call<T>('GET', path),
    post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
    del: <T>(path: string) => call<T>('DELETE', path),
  }
}
export type Api = ReturnType<typeof createApi>
