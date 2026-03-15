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
    return candidate?.startsWith('/') ? candidate : '/'
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    const completeAuth = async () => {
      const supabase = supabaseBrowser()
      const code = searchParams.get('code')
      let accessToken: string | null = null
      let expiresIn: number | undefined
      let expiresAt: number | undefined

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error || !data.session || !data.user) {
          if (isMounted) setStatus(error?.message ?? 'Failed to complete OAuth sign-in.')
          return
        }

        accessToken = data.session.access_token
        expiresIn = data.session.expires_in
        expiresAt = data.session.expires_at
      } else {
        const [{ data: sessionData }, { data: userData }] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser(),
        ])

        if (!sessionData.session || !userData.user) {
          if (isMounted) setStatus('Missing OAuth code. Please try signing in again.')
          return
        }

        accessToken = sessionData.session.access_token
        expiresIn = sessionData.session.expires_in
        expiresAt = sessionData.session.expires_at
      }

      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          expiresIn,
          expiresAt,
        }),
      })

      if (!sessionRes.ok) {
        if (isMounted) setStatus('Signed in, but failed to persist session. Please retry sign-in.')
        return
      }

      router.replace(nextPath)
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
