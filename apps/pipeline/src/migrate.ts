/** Apply the studio database migrations (briefs, builds, invites). Uses the UNPOOLED URL like the client sites do. */
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import path from 'node:path'
import pg from 'pg'

const url = process.env['STUDIO_DATABASE_URL_UNPOOLED'] ?? process.env['STUDIO_DATABASE_URL']
if (!url) throw new Error('STUDIO_DATABASE_URL_UNPOOLED (or STUDIO_DATABASE_URL) is required')
const pool = new pg.Pool({ connectionString: url, max: 1 })
await migrate(drizzle(pool), { migrationsFolder: path.resolve(import.meta.dirname, '../migrations') })
await pool.end()
console.log('studio migrations applied')
