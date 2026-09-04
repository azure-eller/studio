/**
 * `pnpm db:migrate` — applies @studio/core's shipped migrations. Neon databases go over its HTTPS driver (a Claude
 * Code cloud sandbox blocks raw Postgres ports); anything else uses the UNPOOLED connection (SPEC §3).
 */
import { migrationsFolder } from '@studio/core/migrations'

const url = process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']
if (!url) {
  console.error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is required')
  process.exit(1)
}
if (/\.neon\.tech$/i.test(new URL(url).hostname)) {
  const { neon } = await import('@neondatabase/serverless')
  const { drizzle } = await import('drizzle-orm/neon-http')
  const { migrate } = await import('drizzle-orm/neon-http/migrator')
  await migrate(drizzle(neon(url)), { migrationsFolder })
} else {
  const pg = (await import('pg')).default
  const { drizzle } = await import('drizzle-orm/node-postgres')
  const { migrate } = await import('drizzle-orm/node-postgres/migrator')
  const pool = new pg.Pool({ connectionString: url, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder })
  } finally {
    await pool.end()
  }
}
console.log(`migrations applied from ${migrationsFolder}`)
