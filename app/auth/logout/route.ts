import { NextResponse } from 'next/server'
import { authCookieName } from '@/lib/auth/token'

export async function GET(req: Request) {
  const response = NextResponse.redirect(new URL('/', req.url))
  response.cookies.set(authCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
