import { and, asc, count, desc, eq, getTableColumns, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { Collection } from '../collections/types'
import { revalidateTags } from '../content/revalidate'
import { requireSession } from './auth'
import type { Ctx } from './context'
import { HttpError, json, readJson } from './http'

function col(c: Collection, prop: string) {
  const column = (getTableColumns(c.table) as Record<string, unknown>)[prop]
  if (!column) throw new HttpError(400, `unknown_column:${prop}`)
  return column as never
}

function getCollection(ctx: Ctx, name: string): Collection {
  const c = ctx.collections.byName[name]
  if (!c) throw new HttpError(404, 'unknown_collection')
  return c
}

export async function adminList(req: Request, ctx: Ctx, name: string): Promise<Response> {
  await requireSession(req, ctx)
  const c = getCollection(ctx, name)
  const q = new URL(req.url).searchParams
  const page = Math.max(1, Number(q.get('page') ?? 1) || 1)
  const perPage = Math.min(100, Math.max(1, Number(q.get('perPage') ?? 25) || 25))
  const sortProp = q.get('sort') ?? c.list.sort[0]
  const dir = (q.get('dir') ?? c.list.sort[1]) === 'asc' ? asc : desc
  const term = (q.get('q') ?? '').trim()
  const allowedSort = new Set([...c.list.columns, c.list.sort[0], 'createdAt', 'updatedAt', 'id'])
  if (!allowedSort.has(sortProp)) throw new HttpError(400, 'invalid_sort')

  let where: SQL | undefined
  if (term && c.list.search?.length) {
    where = or(...c.list.search.map((p) => ilike(col(c, p), `%${term.replace(/[%_]/g, '\\$&')}%`)))
  }
  const inbox = 'readAt' in c.fields
  if (inbox && q.get('unread') === '1') where = and(where, isNull(col(c, 'readAt')))
  const rows = await ctx.db
    .select()
    .from(c.table)
    .where(where)
    .orderBy(dir(col(c, sortProp)), desc(col(c, 'createdAt')))
    .limit(perPage)
    .offset((page - 1) * perPage)
  const total = (await ctx.db.select({ n: count() }).from(c.table).where(where))[0]?.n ?? 0
  // Collections with a read marker report how many rows are unread, so the admin can badge them.
  const unread = inbox ? ((await ctx.db.select({ n: count() }).from(c.table).where(isNull(col(c, 'readAt'))))[0]?.n ?? 0) : undefined
  return json(200, { rows, total, page, perPage, ...(unread === undefined ? {} : { unread }) })
}

export async function adminGet(req: Request, ctx: Ctx, name: string, id: string): Promise<Response> {
  await requireSession(req, ctx)
  const c = getCollection(ctx, name)
  const rows = await ctx.db.select().from(c.table).where(eq(col(c, 'id'), id)).limit(1)
  if (!rows[0]) throw new HttpError(404, 'not_found')
  return json(200, { row: rows[0] })
}

function applyPublishRule(c: Collection, data: Record<string, unknown>, now: Date) {
  if ('publishedAt' in c.fields && data['status'] === 'published' && !data['publishedAt']) data['publishedAt'] = now
}

export async function adminCreate(req: Request, ctx: Ctx, name: string): Promise<Response> {
  await requireSession(req, ctx)
  const c = getCollection(ctx, name)
  if (c.readOnly) throw new HttpError(405, 'read_only')
  const input = (await readJson(req)) as Record<string, unknown>
  for (const [k, f] of Object.entries(c.fields)) if (f.default !== undefined && input[k] === undefined) input[k] = f.default
  const parsed = c.insertSchema.safeParse(input)
  if (!parsed.success) throw new HttpError(400, 'invalid_body', parsed.error.issues)
  const data = parsed.data as Record<string, unknown>
  applyPublishRule(c, data, ctx.now())
  const rows = await ctx.db.insert(c.table).values(data as never).returning()
  const row = rows[0] as Record<string, unknown>
  revalidateTags(c.revalidate(row))
  return json(201, { row })
}

export async function adminUpdate(req: Request, ctx: Ctx, name: string, id: string): Promise<Response> {
  await requireSession(req, ctx)
  const c = getCollection(ctx, name)
  if (c.readOnly) throw new HttpError(405, 'read_only')
  const parsed = c.updateSchema.safeParse(await readJson(req))
  if (!parsed.success) throw new HttpError(400, 'invalid_body', parsed.error.issues)
  const before = (await ctx.db.select().from(c.table).where(eq(col(c, 'id'), id)).limit(1))[0] as Record<string, unknown> | undefined
  if (!before) throw new HttpError(404, 'not_found')
  const data = { ...(parsed.data as Record<string, unknown>) }
  applyPublishRule(c, { ...before, ...data }, ctx.now())
  if (data['status'] === 'published' && !before['publishedAt'] && !data['publishedAt'] && 'publishedAt' in c.fields) data['publishedAt'] = ctx.now()
  const rows = await ctx.db.update(c.table).set(data as never).where(eq(col(c, 'id'), id)).returning()
  const row = rows[0] as Record<string, unknown>
  revalidateTags([...c.revalidate(before), ...c.revalidate(row)])
  return json(200, { row })
}

export async function adminDelete(req: Request, ctx: Ctx, name: string, id: string): Promise<Response> {
  await requireSession(req, ctx)
  const c = getCollection(ctx, name)
  if (c.readOnly) throw new HttpError(405, 'read_only')
  const rows = await ctx.db.delete(c.table).where(eq(col(c, 'id'), id)).returning()
  const row = rows[0] as Record<string, unknown> | undefined
  if (!row) throw new HttpError(404, 'not_found')
  revalidateTags(c.revalidate(row))
  return json(200, { ok: true })
}

/** Mark-read for submissions without opening writes on a read-only collection. */
export async function adminMarkRead(req: Request, ctx: Ctx, name: string, id: string): Promise<Response> {
  await requireSession(req, ctx)
  const c = getCollection(ctx, name)
  if (!('readAt' in c.fields)) throw new HttpError(404, 'not_found')
  const rows = await ctx.db.update(c.table).set({ readAt: sql`now()` } as never).where(eq(col(c, 'id'), id)).returning()
  if (!rows[0]) throw new HttpError(404, 'not_found')
  return json(200, { row: rows[0] })
}
