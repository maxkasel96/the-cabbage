'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getRoleLabel } from '@/lib/auth/roles'
import { persistServerSession } from '@/lib/auth/persistServerSession'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { signOutAndRedirect } from '@/lib/auth/clientSignOut'

type AuthState = {
  isAuthenticated: boolean
  role: string | null
}

export default function AuthControls() {
  const router = useRouter()
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

  const handleAdminNavigation = async (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    await persistServerSession()
    router.push('/admin/games')
  }

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
      {auth.role === 'admin' ? (
        <Link href="/admin/games" prefetch={false} onClick={handleAdminNavigation}>
          Admin
        </Link>
      ) : null}
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
