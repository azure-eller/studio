import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { media, MEDIA_MAX_BYTES, MEDIA_MIMES } from '../db/schema'
import { tagsFor } from '../collections/define'
import { objectKey, presignPut } from '../storage/r2'
import { mediaUrl } from '../storage/url'
import { requireSession } from './auth'
import type { Ctx } from './context'
import { HttpError, json, readJson } from './http'

const presignSchema = z.object({
  filename: z.string().min(1).max(200),
  // SVG can carry script; it is never accepted for upload even though the column allows it.
  mime: z.enum(MEDIA_MIMES).refine((m) => m !== 'image/svg+xml', 'SVG is not accepted'),
  sizeBytes: z.number().int().positive().max(MEDIA_MAX_BYTES),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  alt: z.string().max(200).optional(),
  collection: z.string().regex(/^[a-z0-9-]+$/).max(40).optional(),
})

export async function presign(req: Request, ctx: Ctx): Promise<Response> {
  await requireSession(req, ctx)
  const body = presignSchema.safeParse(await readJson(req))
  if (!body.success) throw new HttpError(400, 'invalid_body', body.error.issues)
  const d = body.data
  if (d.mime.startsWith('image/') && (!d.width || !d.height)) throw new HttpError(400, 'image_dimensions_required')
  const key = objectKey(ctx.env.R2_PREFIX, d.filename)
  const rows = await ctx.db
    .insert(media)
    .values({
      key,
      filename: d.filename,
      mime: d.mime,
      sizeBytes: d.sizeBytes,
      width: d.width ?? null,
      height: d.height ?? null,
      alt: d.alt ?? '',
      collection: d.collection ?? null,
    })
    .returning({ id: media.id })
  const uploadUrl = await presignPut(ctx.s3, ctx.env.R2_BUCKET, { key, mime: d.mime, sizeBytes: d.sizeBytes })
  return json(200, { uploadUrl, key, mediaId: rows[0]!.id, publicUrl: mediaUrl(ctx.env.NEXT_PUBLIC_MEDIA_BASE_URL, key) })
}

const confirmSchema = z.object({ mediaId: z.uuid() })

export async function presignConfirm(req: Request, ctx: Ctx): Promise<Response> {
  await requireSession(req, ctx)
  const body = confirmSchema.safeParse(await readJson(req))
  if (!body.success) throw new HttpError(400, 'invalid_body', body.error.issues)
  const rows = await ctx.db
    .update(media)
    .set({ confirmedAt: ctx.now() })
    .where(eq(media.id, body.data.mediaId))
    .returning()
  const row = rows[0]
  if (!row) throw new HttpError(404, 'not_found')
  const c = Object.values(ctx.collections.byName).find((x) => x.table === media)
  if (c) ctx.cache.revalidate(tagsFor(c, row))
  return json(200, { media: row })
}
