import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Db } from '../db/client'
import { magicLinks } from '../db/schema'

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return toHex(new Uint8Array(digest))
}

/** Creates a single-use token; the raw value exists only in the returned string (and the email). */
export async function createMagicLink(db: Db, email: string, now = new Date()): Promise<string> {
  const raw = toHex(crypto.getRandomValues(new Uint8Array(32)))
  await db.insert(magicLinks).values({
    email: email.toLowerCase(),
    tokenHash: await sha256Hex(raw),
    expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS),
  })
  return raw
}

/** Marks the token used and returns its email, or null if unknown/used/expired. */
export async function consumeMagicLink(db: Db, raw: string, now = new Date()): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(raw)) return null
  const hash = await sha256Hex(raw)
  const rows = await db
    .update(magicLinks)
    .set({ usedAt: now })
    .where(and(eq(magicLinks.tokenHash, hash), isNull(magicLinks.usedAt), gt(magicLinks.expiresAt, now)))
    .returning({ email: magicLinks.email })
  return rows[0]?.email ?? null
}
