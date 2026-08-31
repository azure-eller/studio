import { sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { rateLimits } from '../db/schema'

/** Fixed-window counter in Postgres (works across serverless instances). Returns whether this hit is allowed. */
export async function rateLimit(db: Db, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const win = sql.raw(`interval '${Math.max(1, Math.floor(windowSeconds))} seconds'`)
  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: sql`now()` })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < now() - ${win} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < now() - ${win} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count })
  const count = rows[0]?.count ?? limit + 1
  return count <= limit
}
