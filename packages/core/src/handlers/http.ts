export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: unknown,
  ) {
    super(message)
  }
}

export function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new HttpError(400, 'invalid_json')
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? '0.0.0.0'
}

/** `/api/site/auth/request` with route `auth/request` → `/api/site`. */
export function apiBaseFrom(req: Request, routePath: string[]): string {
  const p = new URL(req.url).pathname.replace(/\/+$/, '')
  const suffix = '/' + routePath.join('/')
  return p.endsWith(suffix) ? p.slice(0, -suffix.length) : p
}

export function redirect(location: string, headers?: Record<string, string>): Response {
  return new Response(null, { status: 303, headers: { location, ...headers } })
}
