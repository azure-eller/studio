/**
 * Designer sign-in for /studio: stateless magic links and sessions signed with STUDIO_AUTH_SECRET (jose).
 * No tables; revoke everything by rotating the secret. Allowlist = STUDIO_ADMIN_EMAILS.
 */
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { env } from './env'

const COOKIE = 'studio_console'
const key = () => new TextEncoder().encode(env().STUDIO_AUTH_SECRET)

export function isAdmin(email: string): boolean {
  return env().STUDIO_ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function magicToken(email: string): Promise<string> {
  return new SignJWT({ email: email.toLowerCase(), kind: 'magic' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('15m').sign(key())
}

export async function verifyMagic(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    return payload['kind'] === 'magic' && typeof payload['email'] === 'string' && isAdmin(payload['email']) ? payload['email'] : null
  } catch {
    return null
  }
}

export async function startSession(email: string): Promise<void> {
  const jwt = await new SignJWT({ email, kind: 'session' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(key())
  ;(await cookies()).set(COOKIE, jwt, { httpOnly: true, secure: true, sameSite: 'lax', path: '/studio', maxAge: 30 * 86400 })
}

export async function currentAdmin(): Promise<string | null> {
  const c = (await cookies()).get(COOKIE)?.value
  if (!c) return null
  try {
    const { payload } = await jwtVerify(c, key(), { algorithms: ['HS256'] })
    return payload['kind'] === 'session' && typeof payload['email'] === 'string' && isAdmin(payload['email']) ? payload['email'] : null
  } catch {
    return null
  }
}

export async function endSession(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
