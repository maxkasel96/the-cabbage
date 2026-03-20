'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminSubNav from '@/app/components/AdminSubNav'
import Nav from '@/app/components/Nav'
import PageTitle from '@/app/components/PageTitle'

type UserRole = 'admin' | 'standard'

type AdminUser = {
  id: string
  email: string | null
  role: UserRole
  created_at: string
  profile: {
    display_name: string | null
    player_id: string | null
    linked_player_name: string | null
    updated_at: string
  } | null
}

type AdminPlayer = {
  id: string
  display_name: string
  is_active: boolean
}

type PlayerLoginIdentity = {
  id: string
  player_id: string
  provider: 'google'
  email: string
  auth_user_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  player: AdminPlayer | null
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [loginIdentities, setLoginIdentities] = useState<PlayerLoginIdentity[]>([])
  const [status, setStatus] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingLogins, setLoadingLogins] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [savingLoginId, setSavingLoginId] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [approvedEmail, setApprovedEmail] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)

  const availablePlayers = useMemo(
    () => players.filter((player) => player.is_active || loginIdentities.some((identity) => identity.player_id === player.id)),
    [loginIdentities, players]
  )

  const loadUsers = async () => {
    setLoadingUsers(true)
    setStatus('')

    const res = await fetch('/api/admin/roles', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load users.')
      setLoadingUsers(false)
      return
    }

    setUsers(json.users ?? [])
    setLoadingUsers(false)
  }

  const loadPlayerLogins = async () => {
    setLoadingLogins(true)

    const res = await fetch('/api/admin/player-logins', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load player login identities.')
      setLoadingLogins(false)
      return
    }

    setLoginIdentities(json.identities ?? [])
    setPlayers(json.players ?? [])
    setLoadingLogins(false)
  }

  useEffect(() => {
    void Promise.all([loadUsers(), loadPlayerLogins()])
  }, [])

  const updateRole = async (userId: string, role: UserRole) => {
    setSavingUserId(userId)
    setStatus('')

    const res = await fetch('/api/admin/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to update role.')
      setSavingUserId(null)
      return
    }

    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)))
    setSavingUserId(null)
    setStatus('Role updated.')
  }

  const createPlayerLogin = async () => {
    setStatus('')

    const email = approvedEmail.trim().toLowerCase()

    if (!selectedPlayerId || !email) {
      setStatus('Choose a player and enter an approved Google email.')
      return
    }

    setSavingLoginId('new')

    const res = await fetch('/api/admin/player-logins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: selectedPlayerId,
        email,
        isActive: createIsActive,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to save the approved player login.')
      setSavingLoginId(null)
      return
    }

    setSelectedPlayerId('')
    setApprovedEmail('')
    setCreateIsActive(true)
    await loadPlayerLogins()
    setSavingLoginId(null)
    setStatus('Approved player login saved.')
  }

  const updatePlayerLogin = async (
    identityId: string,
    updates: { email?: string; isActive?: boolean; clearAuthUserId?: boolean }
  ) => {
    setSavingLoginId(identityId)
    setStatus('')

    const res = await fetch('/api/admin/player-logins', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: identityId, ...updates }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to update the approved player login.')
      setSavingLoginId(null)
      return
    }

    await loadPlayerLogins()
    setSavingLoginId(null)
    setStatus('Approved player login updated.')
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
        <div className="admin-layout">
          <AdminSubNav />
          <div className="admin-content">
            <PageTitle>Admin: Users</PageTitle>
            <p>
              Assign one of the two supported roles: standard or admin. Authenticated accounts also need a linked
              player login identity before they can use member-only parts of the app.
            </p>

            {status ? <p>{status}</p> : null}

            {loadingUsers ? <p>Loading users...</p> : null}

            {!loadingUsers ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Current role</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Display name</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Linked player</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Profile updated</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Set role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        {user.email ?? 'No email'}
                      </td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>{user.role}</td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        {user.profile?.display_name ?? 'Not set'}
                      </td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        {user.profile?.linked_player_name ?? (user.profile?.player_id ? user.profile.player_id : 'Not linked')}
                      </td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        {user.profile?.updated_at ? formatDate(user.profile.updated_at) : 'Not created'}
                      </td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        <select
                          disabled={savingUserId === user.id}
                          value={user.role}
                          onChange={(event) => {
                            void updateRole(user.id, event.target.value as UserRole)
                          }}
                        >
                          <option value="standard">standard</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            <section
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 18,
                background: 'var(--surface)',
                display: 'grid',
                gap: 16,
              }}
            >
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Approved Google player logins</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Add or update the exact Google email that a player is allowed to use. Example: Claire can be approved
                  with <code>claire.sons21@gmail.com</code> before her first sign-in.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'minmax(220px, 1fr) minmax(240px, 1fr) auto',
                  alignItems: 'end',
                }}
              >
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Player</span>
                  <select value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)}>
                    <option value="">Select a player</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.display_name}
                        {!player.is_active ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Approved Google email</span>
                  <input
                    type="email"
                    value={approvedEmail}
                    onChange={(event) => setApprovedEmail(event.target.value)}
                    placeholder="claire.sons21@gmail.com"
                  />
                </label>

                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={createIsActive}
                    onChange={(event) => setCreateIsActive(event.target.checked)}
                  />
                  Active
                </label>
              </div>

              <div>
                <button type="button" onClick={() => void createPlayerLogin()} disabled={savingLoginId === 'new'}>
                  {savingLoginId === 'new' ? 'Saving...' : 'Save approved login'}
                </button>
              </div>

              {loadingLogins ? <p>Loading approved player logins...</p> : null}

              {!loadingLogins ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Player</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Approved Google email</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Linked auth user</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Updated</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginIdentities.map((identity) => (
                      <tr key={identity.id}>
                        <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                          {identity.player?.display_name ?? identity.player_id}
                        </td>
                        <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                          <input
                            type="email"
                            defaultValue={identity.email}
                            onBlur={(event) => {
                              const nextEmail = event.target.value.trim().toLowerCase()
                              if (nextEmail && nextEmail !== identity.email) {
                                void updatePlayerLogin(identity.id, { email: nextEmail })
                              }
                            }}
                            disabled={savingLoginId === identity.id}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                          {identity.auth_user_id ?? 'Not linked yet'}
                        </td>
                        <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                          {identity.is_active ? 'Active' : 'Inactive'}
                        </td>
                        <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                          {formatDate(identity.updated_at)}
                        </td>
                        <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              disabled={savingLoginId === identity.id}
                              onClick={() =>
                                void updatePlayerLogin(identity.id, {
                                  isActive: !identity.is_active,
                                })
                              }
                            >
                              {identity.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              disabled={savingLoginId === identity.id || !identity.auth_user_id}
                              onClick={() =>
                                void updatePlayerLogin(identity.id, {
                                  clearAuthUserId: true,
                                })
                              }
                            >
                              Clear link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
