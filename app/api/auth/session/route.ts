import { NextResponse } from 'next/server'
import { authCookieName } from '@/lib/auth/token'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const accessToken = body?.accessToken as string | undefined
  const expiresIn = body?.expiresIn as number | undefined

  if (!accessToken || typeof expiresIn !== 'number') {
    return NextResponse.json({ error: 'accessToken and expiresIn are required.' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(authCookieName, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: expiresIn,
  })

  return response
}
