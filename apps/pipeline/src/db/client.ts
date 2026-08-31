import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import pg from 'pg'
import * as schema from './schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StudioDb = PgDatabase<any, any, any>

export function createStudioDb(url: string): StudioDb {
  if (/\.neon\.tech$/i.test(new URL(url).hostname)) return drizzleNeon(neon(url), { schema })
  return drizzlePg(new pg.Pool({ connectionString: url, max: 2 }), { schema })
}
