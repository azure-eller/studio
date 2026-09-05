import { createDb, env, type Db } from '@studio/core'

let db: Db | undefined
export function getDb(): Db {
  return (db ??= createDb(env.DATABASE_URL))
}
