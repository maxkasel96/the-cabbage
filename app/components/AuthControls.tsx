'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getRoleLabel } from '@/lib/auth/roles'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { signOutAndRedirect } from '@/lib/auth/clientSignOut'

type AuthState = {
  isAuthenticated: boolean
  role: string | null
}

export default function AuthControls() {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, role: null })

  useEffect(() => {
    const supabase = supabaseBrowser()

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      setAuth({
        isAuthenticated: true,
        role: getRoleLabel(user.app_metadata?.role ?? user.user_metadata?.role ?? null),
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuth({ isAuthenticated: false, role: null })
        return
      }

      setAuth({
        isAuthenticated: true,
        role: getRoleLabel(session.user.app_metadata?.role ?? session.user.user_metadata?.role ?? null),
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (!auth.isAuthenticated) {
    return (
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 60 }}>
        <Link href="/auth/login">Sign in</Link>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Link href="/account/profile">My profile</Link>
      {auth.role === 'admin' ? <Link href="/admin/games">Admin</Link> : null}
      <Link
        href="/auth/logout"
        onClick={(event) => {
          event.preventDefault()
          void signOutAndRedirect()
        }}
      >
        Sign out
      </Link>
    </div>
  )
}
