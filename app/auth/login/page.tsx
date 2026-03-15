'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('')

  const nextPath = useMemo(() => {
    const candidate = searchParams.get('next')

    if (candidate?.startsWith('/')) {
      return candidate
    }

    return '/admin/games'
  }, [searchParams])

  const signInWithGoogle = async () => {
    setStatus('Redirecting to Google...')

    const supabase = supabaseBrowser()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setStatus(error.message)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 24,
          background: 'var(--surface)',
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8 }}>Sign in</h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: 'var(--text-secondary)' }}>
          Use Google to authenticate with Supabase OAuth.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            padding: '10px 14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Continue with Google
        </button>
        {status ? <p style={{ marginBottom: 0 }}>{status}</p> : null}
      </div>
    </main>
  )
}
