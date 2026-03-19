'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Nav from '@/app/components/Nav'
import PageTitle from '@/app/components/PageTitle'

type ProfileData = Record<string, unknown>

type Profile = {
  user_id: string
  email: string | null
  display_name: string | null
  role: 'admin' | 'standard'
  player_id: string | null
  profile_data: ProfileData
  created_at: string
  updated_at: string
}

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function AccountProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState('Loading profile...')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [requiresSignIn, setRequiresSignIn] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      setStatus('Loading profile...')
      setError('')
      setRequiresSignIn(false)

      const res = await fetch('/api/account/profile', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (res.status === 401) {
        setRequiresSignIn(true)
        setStatus('')
        setError('')
        return
      }

      if (!res.ok) {
        setStatus('')
        setError(json.error || 'Failed to load your profile.')
        return
      }

      setProfile(json.profile ?? null)
      setDisplayName(json.profile?.display_name ?? '')
      setStatus('')
    }

    void loadProfile()
  }, [])

  const profileNotes = useMemo(() => {
    if (!profile) {
      return []
    }

    return [
      `Role: ${profile.role}`,
      profile.player_id ? `Linked player: ${profile.player_id}` : 'Linked player: not assigned yet',
      `Profile created: ${formatDate(profile.created_at)}`,
      `Last saved: ${formatDate(profile.updated_at)}`,
    ]
  }, [profile])

  const saveProfile = async () => {
    setSaving(true)
    setStatus('Saving profile...')
    setError('')

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus('')
      setError(json.error || 'Failed to save your profile.')
      setSaving(false)
      return
    }

    setProfile(json.profile ?? null)
    setDisplayName(json.profile?.display_name ?? '')
    setSaving(false)
    setStatus('Profile saved.')
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: 'var(--page-background)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      <div className="pageShell">
        <div className="stickyHeader">
          <Nav />
        </div>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'grid', gap: 18 }}>
          <PageTitle>My profile</PageTitle>
          <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
            This page establishes the base account-profile framework. Your role permissions are already enforced,
            your profile record is created automatically, and the future player association can be added without
            changing the sign-in flow.
          </p>

          {requiresSignIn ? (
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 20,
                background: 'var(--surface)',
              }}
            >
              <p>You need to sign in before you can create or edit a profile.</p>
              <Link href="/auth/login?next=%2Faccount%2Fprofile">Go to sign in</Link>
            </div>
          ) : null}

          {!requiresSignIn ? (
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 20,
                background: 'var(--surface)',
                display: 'grid',
                gap: 16,
              }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="display-name" style={{ fontWeight: 600 }}>
                  Display name
                </label>
                <input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="How should we refer to you?"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    color: 'inherit',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  More user-editable fields can be layered onto this profile later. For now, the framework stores a
                  canonical profile row, role, and future player-link placeholder.
                </span>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Current account summary</div>
                {profile ? (
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                    <li>Email: {profile.email ?? 'No email on file'}</li>
                    {profileNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || requiresSignIn}
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    padding: '10px 14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
                {status ? <span>{status}</span> : null}
                {error ? <span style={{ color: 'var(--danger-text, #b42318)' }}>{error}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
