'use client'

import { type FormEvent, Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { canUsePasswordAuth, isProduction } from '@/lib/auth/env'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false)

  const nextPath = useMemo(() => {
    const candidate = searchParams.get('next')

    if (candidate?.startsWith('/')) {
      return candidate
    }

    return '/'
  }, [searchParams])

  const signInWithGoogle = async () => {
    setErrorMessage('')
    setStatus('Redirecting to Google...')
    setIsSubmittingGoogle(true)

    const supabase = supabaseBrowser()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setStatus('')
      setErrorMessage(error.message)
    }

    setIsSubmittingGoogle(false)
  }

  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')
    setStatus('Signing in...')
    setIsSubmittingPassword(true)

    const supabase = supabaseBrowser()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session || !data.user) {
      setStatus('')
      setErrorMessage(error?.message ?? 'Unable to sign in with email and password.')
      setIsSubmittingPassword(false)
      return
    }

    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
      }),
    })

    if (!sessionRes.ok) {
      setStatus('')
      setErrorMessage('Signed in, but failed to establish server session. Please try again.')
      setIsSubmittingPassword(false)
      return
    }

    router.replace(nextPath)
  }

  return (
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
        {isProduction
          ? 'Use Google to authenticate with Supabase OAuth.'
          : 'Use email/password (dev/preview) or Google OAuth to sign in.'}
      </p>

      {canUsePasswordAuth ? (
        <form onSubmit={signInWithPassword} style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            style={{
              width: '100%',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              padding: '10px 12px',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            style={{
              width: '100%',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              padding: '10px 12px',
            }}
          />
          <button
            type="submit"
            disabled={isSubmittingPassword || isSubmittingGoogle}
            style={{
              width: '100%',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              padding: '10px 14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isSubmittingPassword ? 'Signing in...' : 'Sign in with email'}
          </button>
        </form>
      ) : null}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={isSubmittingPassword || isSubmittingGoogle}
        style={{
          width: '100%',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          padding: '10px 14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isSubmittingGoogle ? 'Redirecting...' : 'Continue with Google'}
      </button>

      {status ? <p style={{ marginBottom: 0 }}>{status}</p> : null}
      {errorMessage ? <p style={{ marginBottom: 0, color: 'var(--danger-text, #b42318)' }}>{errorMessage}</p> : null}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Suspense fallback={<p>Preparing sign-in...</p>}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
