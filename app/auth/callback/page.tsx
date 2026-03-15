'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Completing sign-in...')

  const nextPath = useMemo(() => {
    const candidate = searchParams.get('next')
    return candidate?.startsWith('/') ? candidate : '/admin/games'
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    const completeAuth = async () => {
      const code = searchParams.get('code')

      if (!code) {
        if (isMounted) setStatus('Missing OAuth code. Please try signing in again.')
        return
      }

      const supabase = supabaseBrowser()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !data.session || !data.user) {
        if (isMounted) setStatus(error?.message ?? 'Failed to complete OAuth sign-in.')
        return
      }

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: data.session.access_token,
          expiresIn: data.session.expires_in,
        }),
      })

      const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role
      router.replace(role === 'admin' ? nextPath : '/auth/unauthorized')
    }

    void completeAuth()

    return () => {
      isMounted = false
    }
  }, [nextPath, router, searchParams])

  return <p>{status}</p>
}

export default function AuthCallbackPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Suspense fallback={<p>Completing sign-in...</p>}>
        <AuthCallbackContent />
      </Suspense>
    </main>
  )
}
