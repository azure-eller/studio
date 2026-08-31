import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env } from '../env'

export const PRESIGN_TTL_SECONDS = 600

export function r2Client(env: Pick<Env, 'R2_ACCOUNT_ID' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY'>): S3Client {
  return new S3Client({
    region: 'auto',
    forcePathStyle: true,
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  })
}

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file'
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+\./g, '.')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return cleaned || 'file'
}

/** `sites/<slug>/<uuid>-<safe-filename>` */
export function objectKey(prefix: string, filename: string): string {
  return `${prefix}/${crypto.randomUUID()}-${safeFilename(filename)}`
}

export function isKeyInPrefix(key: string, prefix: string): boolean {
  return key.startsWith(`${prefix}/`) && !key.includes('..') && key.length <= 300
}

export async function presignPut(
  client: S3Client,
  bucket: string,
  opts: { key: string; mime: string; sizeBytes: number },
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.mime,
    ContentLength: opts.sizeBytes,
  })
  return getSignedUrl(client, cmd, { expiresIn: PRESIGN_TTL_SECONDS })
}

export function publicUrl(mediaBaseUrl: string, key: string): string {
  return `${mediaBaseUrl}/${key}`
}
