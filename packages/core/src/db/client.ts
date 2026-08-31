import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import pg from 'pg'
import * as schema from './schema'

/** Any Drizzle Postgres database (Neon HTTP in production, node-postgres locally, PGlite in tests). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, any, any>

export function isNeonUrl(databaseUrl: string): boolean {
  try {
    return /\.neon\.tech$/i.test(new URL(databaseUrl).hostname)
  } catch {
    return false
  }
}

/**
 * Runtime connection. Neon URLs use the HTTP driver (pass the POOLED string); anything else
 * (local dev, CI, the template smoke test) uses node-postgres, so a plain Postgres works everywhere.
 */
export function createDb(databaseUrl: string): Db {
  if (isNeonUrl(databaseUrl)) return drizzleNeon(neon(databaseUrl), { schema })
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 })
  return drizzlePg(pool, { schema })
}
