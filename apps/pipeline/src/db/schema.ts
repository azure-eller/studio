/**
 * The STUDIO database (one Neon project for the business, not per client): briefs, builds, invites.
 * Shared by the intake app (writes briefs/invites, dispatches) and the pipeline (writes builds).
 */
import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const BRIEF_STATUSES = ['draft', 'queued', 'provisioning', 'building', 'deploying', 'verifying', 'done', 'failed'] as const
export type BriefStatus = (typeof BRIEF_STATUSES)[number]
export const BUILD_STEPS = ['provision', 'scaffold', 'build', 'gates', 'ship', 'notify'] as const
export type BuildStep = (typeof BUILD_STEPS)[number]

const id = () => uuid('id').primaryKey().defaultRandom()
const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

export const invites = pgTable('invites', {
  id: id(),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  note: text('note'),
  usedAt: timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps(),
})

export const briefs = pgTable(
  'briefs',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    inviteId: uuid('invite_id').references(() => invites.id, { onDelete: 'set null' }),
    clientEmail: text('client_email').notNull(),
    status: text('status').$type<BriefStatus>().notNull().default('draft'),
    /** Validated against template/brief.schema.json before it is queued. */
    brief: jsonb('brief').$type<Record<string, unknown>>(),
    siteUrl: text('site_url'),
    repoUrl: text('repo_url'),
    ...timestamps(),
  },
  (t) => [index('briefs_status_idx').on(t.status), check('briefs_status_check', sql`${t.status} in (${sql.raw(BRIEF_STATUSES.map((s) => `'${s}'`).join(', '))})`)],
)

/** One row per pipeline run; a brief can be re-run. Provisioning identifiers live here so a retry resumes. */
export const builds = pgTable(
  'builds',
  {
    id: id(),
    briefId: uuid('brief_id')
      .notNull()
      .references(() => briefs.id, { onDelete: 'cascade' }),
    step: text('step').$type<BuildStep>(),
    status: text('status').$type<'running' | 'done' | 'failed'>().notNull().default('running'),
    log: text('log').notNull().default(''),
    error: text('error'),
    // provisioning state (idempotency)
    repoFullName: text('repo_full_name'),
    neonProjectId: text('neon_project_id'),
    vercelProjectId: text('vercel_project_id'),
    vercelDeploymentId: text('vercel_deployment_id'),
    dnsRecordId: text('dns_record_id'),
    // model usage (recorded immediately after claude -p returns, before gates)
    modelTurns: integer('model_turns'),
    modelCostUsd: real('model_cost_usd'),
    modelDurationMs: integer('model_duration_ms'),
    fixAttempts: integer('fix_attempts').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('builds_brief_id_idx').on(t.briefId)],
)

export type Brief = typeof briefs.$inferSelect
export type Build = typeof builds.$inferSelect
export type Invite = typeof invites.$inferSelect
