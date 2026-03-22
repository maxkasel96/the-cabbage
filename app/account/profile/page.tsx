'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import PageTitle from '@/app/components/PageTitle'
import Nav from '@/app/components/Nav'
import ProfileImageUploader from '@/app/account/profile/ProfileImageUploader'
import { getEditableAccountProfileFields, profileFieldLimits } from '@/lib/accountProfileFields'

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
  const [bio, setBio] = useState('')
  const [favoriteGames, setFavoriteGames] = useState('')
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

      if (res.status === 401 || res.status === 403) {
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

      const nextProfile = (json.profile ?? null) as Profile | null
      const editableFields = nextProfile ? getEditableAccountProfileFields(nextProfile.profile_data) : null

      setProfile(nextProfile)
      setDisplayName(nextProfile?.display_name ?? '')
      setBio(editableFields?.bio ?? '')
      setFavoriteGames(editableFields?.favoriteGames ?? '')
      setStatus('')
    }

    void loadProfile()
  }, [])

  const editableFields = useMemo(
    () => (profile ? getEditableAccountProfileFields(profile.profile_data) : null),
    [profile]
  )

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
        profileData: {
          bio,
          favoriteGames,
        },
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus('')
      setError(json.error || 'Failed to save your profile.')
      setSaving(false)
      return
    }

    const nextProfile = (json.profile ?? null) as Profile | null
    const nextFields = nextProfile ? getEditableAccountProfileFields(nextProfile.profile_data) : null

    setProfile(nextProfile)
    setDisplayName(nextProfile?.display_name ?? '')
    setBio(nextFields?.bio ?? '')
    setFavoriteGames(nextFields?.favoriteGames ?? '')
    setSaving(false)
    setStatus('Profile saved.')
  }

  const handleProfileImageUploaded = (profileImagePath: string) => {
    setProfile((currentProfile: Profile | null) => {
      if (!currentProfile) {
        return currentProfile
      }

      return {
        ...currentProfile,
        profile_data: {
          ...currentProfile.profile_data,
          profileImagePath,
        },
      }
    })

    setStatus('Profile image uploaded.')
    setError('')
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
            Update the player-facing details that appear on your account profile, including a bio, favorite games,
            and your profile image.
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
              <p>You need to sign in with a linked player account before you can edit a profile.</p>
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
                gap: 18,
              }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="display-name" style={{ fontWeight: 600 }}>
                  Display name
                </label>
                <input
                  id="display-name"
                  value={displayName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)}
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
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label htmlFor="bio" style={{ fontWeight: 600 }}>
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBio(event.target.value)}
                  placeholder="Tell other players a bit about yourself."
                  maxLength={profileFieldLimits.bio}
                  rows={6}
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    color: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {bio.length}/{profileFieldLimits.bio} characters
                </span>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label htmlFor="favorite-games" style={{ fontWeight: 600 }}>
                  Favorite games
                </label>
                <input
                  id="favorite-games"
                  value={favoriteGames}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setFavoriteGames(event.target.value)}
                  placeholder="For now, enter these as a simple text field."
                  maxLength={profileFieldLimits.favoriteGames}
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
                  {favoriteGames.length}/{profileFieldLimits.favoriteGames} characters
                </span>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Profile image</div>
                <ProfileImageUploader
                  displayName={displayName || profile?.display_name || profile?.email || 'Player profile'}
                  currentImagePath={editableFields?.profileImagePath ?? null}
                  disabled={saving || requiresSignIn}
                  onUploadSuccess={handleProfileImageUploaded}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Current account summary</div>
                {profile ? (
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                    <li>Email: {profile.email ?? 'No email on file'}</li>
                    <li>Bio: {editableFields?.bio ?? 'Not added yet'}</li>
                    <li>Favorite games: {editableFields?.favoriteGames ?? 'Not added yet'}</li>
                    <li>Profile image: {editableFields?.profileImagePath ? 'Uploaded' : 'Not uploaded yet'}</li>
                    {profileNotes.map((note: string) => (
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
