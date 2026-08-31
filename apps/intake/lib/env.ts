import { z } from 'zod'

const schema = z.object({
  STUDIO_DATABASE_URL: z.string().min(1),
  STUDIO_DOMAIN: z.string().min(3),
  INTAKE_URL: z.string().url(),
  GH_PAT: z.string().min(1),
  GH_ORG: z.string().min(1),
  STUDIO_REPO: z.string().default('studio'),
  DESIGNER_EMAIL: z.email(),
  EMAIL_FROM: z.string().min(3),
  RESEND_API_KEY: z.string().min(1),
  CF_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  MEDIA_BASE_URL: z.string().url(),
  STUDIO_ADMIN_EMAILS: z.string().transform((s) => s.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)),
  STUDIO_AUTH_SECRET: z.string().min(32),
})
export type IntakeEnv = z.infer<typeof schema>
let cache: IntakeEnv | undefined
export function env(): IntakeEnv {
  if (cache) return cache
  const r = schema.safeParse(process.env)
  if (!r.success) throw new Error('intake env invalid:\n' + r.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'))
  return (cache = r.data)
}
