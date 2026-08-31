/**
 * Environment contract — SPEC.md §7. The only place environment variables are read.
 * `apps/pipeline` imports `envKeys` to know exactly what to set on a Vercel project.
 */
import { z } from 'zod'

const httpsUrl = z
  .string()
  .regex(/^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(?:\/[^\s]*)?$/, 'must be an https:// URL (http only for localhost)')
  .transform((u) => u.replace(/\/+$/, ''))

const csvEmails = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.email()).min(1, 'at least one admin email'))

export const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_UNPOOLED: z.string().min(1),
    AUTH_SECRET: z.string().min(32, 'at least 32 characters'),
    ADMIN_EMAILS: csvEmails,
    NEXT_PUBLIC_SITE_URL: httpsUrl,
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(3),
    EMAIL_REPLY_TO: z.email(),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_PREFIX: z.string().regex(/^sites\/[a-z0-9-]+$/, 'must look like sites/<slug>'),
    NEXT_PUBLIC_MEDIA_BASE_URL: httpsUrl,
    STUDIO_DOMAIN: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'must be a hostname'),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  })
  .refine((e) => Boolean(e.STRIPE_SECRET_KEY) === Boolean(e.STRIPE_WEBHOOK_SECRET), {
    message: 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set together',
    path: ['STRIPE_WEBHOOK_SECRET'],
  })

export type Env = z.infer<typeof envSchema>

/** Every variable a site reads, in declaration order. */
export const envKeys = Object.keys(envSchema.shape) as readonly (keyof Env)[]
export const optionalEnvKeys = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const
export const requiredEnvKeys = envKeys.filter(
  (k) => !(optionalEnvKeys as readonly string[]).includes(k),
)

export function parseEnv(source: Record<string, string | undefined>): Env {
  const picked: Record<string, string | undefined> = {}
  for (const k of envKeys) picked[k] = source[k]
  const result = envSchema.safeParse(picked)
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new Error(`Invalid environment:\n${lines.join('\n')}`)
  }
  return result.data
}

export function isStudioHost(siteUrl: string, studioDomain: string): boolean {
  const host = new URL(siteUrl).hostname.toLowerCase()
  const d = studioDomain.toLowerCase()
  return host === d || host.endsWith(`.${d}`)
}

let cache: Env | undefined
/** Parsed lazily on first access so importing the package never throws; the first real use does. */
export const env: Env = new Proxy({} as Env, {
  get(_t, prop) {
    cache ??= parseEnv(process.env)
    return cache[prop as keyof Env]
  },
  has(_t, prop) {
    cache ??= parseEnv(process.env)
    return prop in cache
  },
  ownKeys() {
    cache ??= parseEnv(process.env)
    return Reflect.ownKeys(cache)
  },
  getOwnPropertyDescriptor(_t, prop) {
    cache ??= parseEnv(process.env)
    return Reflect.getOwnPropertyDescriptor(cache, prop)
  },
})

/** Tests only. */
export function _resetEnvCache(): void {
  cache = undefined
}
