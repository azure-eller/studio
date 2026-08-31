import { migrate } from 'drizzle-orm/pglite/migrator'
import { pushSchema } from 'drizzle-kit/api'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import * as schema from '../src/db/schema'
import { MIGRATIONS, testDb } from './helpers'

describe('SPEC §3 — migrations', () => {
  it('ships at least one SQL migration with a journal', () => {
    const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS, 'meta/_journal.json'), 'utf8')) as { entries: unknown[] }
    expect(journal.entries.length).toBeGreaterThan(0)
    expect(fs.readdirSync(MIGRATIONS).some((f) => f.endsWith('.sql'))).toBe(true)
  })

  it('applies to a fresh database and is idempotent', async () => {
    const { db } = await testDb()
    await expect(migrate(db as never, { migrationsFolder: MIGRATIONS })).resolves.toBeUndefined()
  })

  it('leaves no drift against the current schema', async () => {
    const { db } = await testDb()
    const { statementsToExecute } = await pushSchema(schema, db as never)
    expect(statementsToExecute).toEqual([])
  })
})
