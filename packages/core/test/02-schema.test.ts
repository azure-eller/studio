import { eq, getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../src/db/schema'
import { EMPTY_DOC } from '../src/richtext/types'
import { sleep, testDb } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
beforeAll(async () => ({ db } = await testDb()))

const tables = Object.values(schema).filter((v) => is(v, PgTable)) as PgTable[]

describe('SPEC §2 — schema conventions', () => {
  it('every table has id, created_at, updated_at', () => {
    expect(tables.length).toBeGreaterThanOrEqual(8)
    for (const t of tables) {
      const cols = getTableColumns(t)
      expect(Object.keys(cols), getTableName(t)).toEqual(expect.arrayContaining(['id', 'createdAt', 'updatedAt']))
      expect(cols['id']!.columnType).toBe('PgUUID')
    }
  })

  it('updated_at changes on update', async () => {
    const [row] = await db.insert(schema.posts).values({ slug: 'a', title: 'A', body: EMPTY_DOC }).returning()
    await sleep(5)
    const [after] = await db.update(schema.posts).set({ title: 'B' }).where(eq(schema.posts.id, row!.id)).returning()
    expect(after!.updatedAt.getTime()).toBeGreaterThan(row!.updatedAt.getTime())
    expect(after!.createdAt.getTime()).toBe(row!.createdAt.getTime())
  })

  it('check constraints reject bad statuses and forms', async () => {
    await expect(db.insert(schema.posts).values({ slug: 'bad', title: 'x', body: EMPTY_DOC, status: 'bogus' as never })).rejects.toThrow()
    await expect(db.insert(schema.submissions).values({ form: 'nope' as never, payload: {} })).rejects.toThrow()
    await expect(db.insert(schema.media).values({ key: 'sites/acme/x', filename: 'x', mime: 'text/html', sizeBytes: 1 })).rejects.toThrow()
  })

  it('slugs and media keys are unique', async () => {
    await db.insert(schema.posts).values({ slug: 'dup', title: 'x', body: EMPTY_DOC })
    await expect(db.insert(schema.posts).values({ slug: 'dup', title: 'y', body: EMPTY_DOC })).rejects.toThrow()
    await db.insert(schema.media).values({ key: 'sites/acme/k', filename: 'k', mime: 'image/png', sizeBytes: 1 })
    await expect(db.insert(schema.media).values({ key: 'sites/acme/k', filename: 'k2', mime: 'image/png', sizeBytes: 1 })).rejects.toThrow()
  })

  it('deleting media nulls cover references', async () => {
    const [m] = await db.insert(schema.media).values({ key: 'sites/acme/cover', filename: 'c', mime: 'image/png', sizeBytes: 1, width: 10, height: 10 }).returning()
    const [p] = await db.insert(schema.posts).values({ slug: 'with-cover', title: 'x', body: EMPTY_DOC, coverMediaId: m!.id }).returning()
    await db.delete(schema.media).where(eq(schema.media.id, m!.id))
    const [after] = await db.select().from(schema.posts).where(eq(schema.posts.id, p!.id))
    expect(after!.coverMediaId).toBeNull()
  })

  it('select options registry matches the check constraints', () => {
    expect(schema.columnEnums['posts']!['status']).toEqual(['draft', 'published'])
    expect(schema.columnEnums['donations']!['status']).toEqual(['pending', 'paid', 'refunded'])
    expect(schema.columnEnums['submissions']!['form']).toEqual(['contact', 'volunteer', 'newsletter', 'register'])
  })
})
