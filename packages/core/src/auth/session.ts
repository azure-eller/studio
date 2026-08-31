import { eq } from 'drizzle-orm'
import { jwtVerify, SignJWT } from 'jose'
import type { Db } from '../db/client'
import { sessions } from '../db/schema'

export const SESSION_COOKIE = 'studio_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SLIDE_BELOW_MS = 15 * 24 * 60 * 60 * 1000

const key = (secret: string) => new TextEncoder().encode(secret)

export async function createSession(db: Db, email: string, now = new Date()): Promise<string> {
  const rows = await db
    .insert(sessions)
    .values({ email: email.toLowerCase(), expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
    .returning({ id: sessions.id })
  return rows[0]!.id
}

export async function signSessionToken(secret: string, sid: string): Promise<string> {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_TTL_MS) / 1000))
    .sign(key(secret))
}

export async function verifySessionToken(secret: string, token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] })
    return typeof payload['sid'] === 'string' ? payload['sid'] : null
  } catch {
    return null
  }
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
}
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export interface SessionInfo {
  id: string
  email: string
}

/** Validates the cookie's signature, then the row (so deleting the row revokes). Slides expiry when under 15 days. */
export async function readSession(db: Db, secret: string, req: Request, now = new Date()): Promise<SessionInfo | null> {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return null
  const sid = await verifySessionToken(secret, token)
  if (!sid) return null
  const rows = await db.select().from(sessions).where(eq(sessions.id, sid)).limit(1)
  const row = rows[0]
  if (!row || row.expiresAt.getTime() <= now.getTime()) return null
  if (row.expiresAt.getTime() - now.getTime() < SLIDE_BELOW_MS) {
    await db.update(sessions).set({ expiresAt: new Date(now.getTime() + SESSION_TTL_MS) }).where(eq(sessions.id, sid))
  }
  return { id: row.id, email: row.email }
}

export async function deleteSession(db: Db, sid: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sid))
}
