/** `pnpm db:migrate` — applies @studio/core's shipped migrations over the UNPOOLED connection (SPEC §3). */
import { migrationsFolder } from '@studio/core/migrations'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const url = process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']
if (!url) {
  console.error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is required')
  process.exit(1)
}
const pool = new pg.Pool({ connectionString: url, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder })
  console.log(`migrations applied from ${migrationsFolder}`)
} finally {
  await pool.end()
}
