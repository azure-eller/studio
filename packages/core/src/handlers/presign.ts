import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { revalidateTags } from '../content/revalidate'
import { TAGS } from '../content/index'
import { media, MEDIA_MAX_BYTES, MEDIA_MIMES } from '../db/schema'
import { objectKey, presignPut, publicUrl } from '../storage/r2'
import { requireSession } from './auth'
import type { Ctx } from './context'
import { HttpError, json, readJson } from './http'

const presignSchema = z.object({
  filename: z.string().min(1).max(200),
  mime: z.enum(MEDIA_MIMES),
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
  const isImage = d.mime.startsWith('image/') && d.mime !== 'image/svg+xml'
  if (isImage && (!d.width || !d.height)) throw new HttpError(400, 'image_dimensions_required')
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
  return json(200, { uploadUrl, key, mediaId: rows[0]!.id, publicUrl: publicUrl(ctx.env.NEXT_PUBLIC_MEDIA_BASE_URL, key) })
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
  if (row.collection) revalidateTags([TAGS.gallery(row.collection)])
  return json(200, { media: row })
}
