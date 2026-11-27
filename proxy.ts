import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'

export async function proxy(req: NextRequest) {
  const access = await requireAdmin(req)
  if (access.ok) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/admin') || access.status === 500) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }
  const url = new URL(access.status === 401 ? '/auth/login' : '/auth/unauthorized', req.url)
  if (access.status === 401) url.searchParams.set('next', req.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }
