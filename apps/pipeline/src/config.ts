/** Pipeline configuration. Secrets are step-scoped in the workflow; each step only requires what it uses. */
import { z } from 'zod'

const base = {
  STUDIO_DATABASE_URL: z.string().min(1),
  STUDIO_DOMAIN: z.string().min(3),
  TEMPLATE_DIR: z.string().min(1),
  DESIGNER_EMAIL: z.email(),
  EMAIL_FROM: z.string().min(3),
  MEDIA_BASE_URL: z.string().url(),
  DRY_RUN: z.string().optional().transform((v) => v === '1' || v === 'true'),
}
const github = {
  GH_PAT: z.string().min(1),
  GH_ORG: z.string().min(1),
  // Commits must be attributed to a GitHub account Vercel knows, or Hobby-plan deployments are BLOCKED.
  GIT_AUTHOR_NAME: z.string().default('studio pipeline'),
  GIT_AUTHOR_EMAIL: z.string().optional(),
}
const neonApi = { NEON_API_KEY: z.string().min(1), NEON_ORG_ID: z.string().optional(), NEON_REGION: z.string().default('aws-us-west-2') }
const vercel = { VERCEL_TOKEN: z.string().min(1), VERCEL_TEAM_ID: z.string().min(1).optional() }
// CF_ZONE_ID is absent when the studio has no domain of its own (STUDIO_DOMAIN=vercel.app): no DNS records are managed.
const cloudflare = { CF_API_TOKEN: z.string().min(1), CF_ZONE_ID: z.string().min(1).optional(), CF_ACCOUNT_ID: z.string().min(1) }
const r2 = { R2_ACCESS_KEY_ID: z.string().min(1), R2_SECRET_ACCESS_KEY: z.string().min(1), R2_BUCKET: z.string().min(1) }
const resend = { RESEND_API_KEY: z.string().min(1) }
// CLAUDE_CODE_OAUTH_TOKEN is required in CI; locally the developer's own `claude` login is used when it is absent.
// MODEL pins which Claude model builds sites (e.g. claude-fable-5-1); unset = the account default.
const claude = { CLAUDE_CODE_OAUTH_TOKEN: z.string().min(1).optional(), MODEL: z.string().optional(), MAX_TURNS: z.coerce.number().int().positive().default(150), FIX_RETRIES: z.coerce.number().int().min(0).default(2) }

export const stepEnv = {
  provision: z.object({ ...base, ...github, ...neonApi, ...vercel, ...cloudflare, ...r2, ...resend }),
  scaffold: z.object({ ...base }),
  build: z.object({ ...base, ...claude }),
  ship: z.object({ ...base, ...github, ...vercel }),
  notify: z.object({ ...base, ...resend, ...vercel }),
  destroy: z.object({ ...base, ...github, ...neonApi, ...vercel, ...cloudflare, ...r2 }),
}
export type StepName = keyof typeof stepEnv

export function loadEnv<S extends StepName>(step: S, source: Record<string, string | undefined> = process.env): z.infer<(typeof stepEnv)[S]> {
  // CI passes unset repo variables as empty strings; treat '' as absent so optionals stay optional.
  const cleaned: Record<string, string> = {}
  for (const [k, v] of Object.entries(source)) if (v !== undefined && v !== '') cleaned[k] = v
  const r = stepEnv[step].safeParse(cleaned)
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`)
    throw new Error(`pipeline ${step}: invalid environment\n${lines.join('\n')}`)
  }
  return r.data as z.infer<(typeof stepEnv)[S]>
}

/** Deterministic names derived from the slug — the only source of naming across GitHub, Neon, Vercel, R2 and DNS. */
export function namesFor(slug: string, studioDomain: string) {
  return {
    repo: slug,
    neonProject: slug,
    vercelProject: slug,
    r2Prefix: `sites/${slug}`,
    host: `${slug}.${studioDomain}`,
    siteUrl: `https://${slug}.${studioDomain}`,
  }
}
