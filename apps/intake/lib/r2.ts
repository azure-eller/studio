import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from './env'

let client: S3Client | undefined
function s3(): S3Client {
  const e = env()
  return (client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${e.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
  }))
}

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file'
  return base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+\./g, '.').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'file'
}

/** Intake uploads go straight to the site's own prefix (sites/<slug>/) — no copy step later. */
export async function presignIntakeUpload(slug: string, filename: string, mime: string, sizeBytes: number): Promise<{ url: string; key: string }> {
  const key = `sites/${slug}/${crypto.randomUUID()}-${safeFilename(filename)}`
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: env().R2_BUCKET, Key: key, ContentType: mime, ContentLength: sizeBytes }), { expiresIn: 600 })
  return { url, key }
}
