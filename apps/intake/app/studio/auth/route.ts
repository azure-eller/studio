import { NextResponse, type NextRequest } from 'next/server'
import { startSession, verifyMagic } from '@/lib/studio-auth'

export async function GET(req: NextRequest): Promise<Response> {
  const email = await verifyMagic(req.nextUrl.searchParams.get('t') ?? '')
  if (!email) return NextResponse.redirect(new URL('/studio/login', req.url))
  await startSession(email)
  return NextResponse.redirect(new URL('/studio', req.url))
}
