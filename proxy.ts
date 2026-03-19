import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRole } from '@/lib/auth/roles'
import { authCookieName } from '@/lib/auth/token'

const getToken = (req: NextRequest) => {
  const header = req.headers.get('authorization')

  if (header?.startsWith('Bearer ')) {
    return header.slice(7)
  }

  return req.cookies.get(authCookieName)?.value ?? null
}

export async function proxy(req: NextRequest) {
  const token = getToken(req)
  const isApiAdminRoute = req.nextUrl.pathname.startsWith('/api/admin')

  if (!token) {
    if (isApiAdminRoute) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.getUser(token)
  const role = data?.user?.app_metadata?.role ?? data?.user?.user_metadata?.role

  if (error || !data?.user) {
    if (isApiAdminRoute) {
      return NextResponse.json({ error: 'Invalid authorization token.' }, { status: 401 })
    }

    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!isAdminRole(role)) {
    if (isApiAdminRoute) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    return NextResponse.redirect(new URL('/auth/unauthorized', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
