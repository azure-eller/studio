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

/** A JSON object body, or 400. */
export async function readObject(req: Request): Promise<Record<string, unknown>> {
  const v = await readJson(req)
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, 'invalid_body')
  return v as Record<string, unknown>
}

/**
 * Postgres constraint errors the schema can't express as zod (uniqueness, checks, bad uuids) become
 * ordinary 4xx responses with the offending field, instead of a 500. Constraint names follow Drizzle's
 * `<table>_<column>_<kind>` convention.
 */
export function pgErrorToHttp(e: unknown): HttpError | null {
  const pg = ((e as { cause?: unknown })?.cause ?? e) as { code?: string; constraint?: string; table?: string; column?: string } | null
  if (!pg || typeof pg !== 'object' || typeof pg.code !== 'string') return null
  const column = () => {
    const name = pg.constraint ?? ''
    const table = pg.table ? `${pg.table}_` : ''
    return name.replace(new RegExp(`^${table}`), '').replace(/_(unique|key|check|idx)$/, '')
  }
  if (pg.code === '23505') return new HttpError(400, 'invalid_body', [{ path: [column()], message: 'Already in use' }])
  if (pg.code === '23514') return new HttpError(400, 'invalid_body', [{ path: [column()], message: 'Not an allowed value' }])
  if (pg.code === '23503') return new HttpError(400, 'invalid_body', [{ path: [column()], message: 'Refers to something that does not exist' }])
  if (pg.code === '23502') return new HttpError(400, 'invalid_body', [{ path: [pg.column ?? column()], message: 'Required' }])
  if (pg.code === '22P02') return new HttpError(404, 'not_found')
  return null
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
