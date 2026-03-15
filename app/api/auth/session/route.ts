import { NextResponse } from 'next/server'
import { authCookieName } from '@/lib/auth/token'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const accessToken = body?.accessToken as string | undefined
  const expiresIn = body?.expiresIn as number | undefined
  const expiresAt = body?.expiresAt as number | undefined

  const resolvedMaxAge =
    typeof expiresIn === 'number' && Number.isFinite(expiresIn)
      ? Math.max(60, Math.floor(expiresIn))
      : typeof expiresAt === 'number' && Number.isFinite(expiresAt)
        ? Math.max(60, Math.floor(expiresAt - Date.now() / 1000))
        : null

  if (!accessToken || resolvedMaxAge === null) {
    return NextResponse.json(
      { error: 'accessToken and either expiresIn or expiresAt are required.' },
      { status: 400 },
    )
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(authCookieName, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: resolvedMaxAge,
  })

  return response
}
