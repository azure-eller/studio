import { createStudioDb, type StudioDb } from '@studio/pipeline/src/db/client'
import { env } from './env'

let db: StudioDb | undefined
export function studioDb(): StudioDb {
  return (db ??= createStudioDb(env().STUDIO_DATABASE_URL))
}
export { briefs, builds, invites } from '@studio/pipeline/src/db/schema'
