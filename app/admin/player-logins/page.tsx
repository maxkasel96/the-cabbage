'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminSubNav from '@/app/components/AdminSubNav'
import Nav from '@/app/components/Nav'
import PageTitle from '@/app/components/PageTitle'

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

const pageStyles = {
  padding: 24,
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  backgroundColor: 'var(--page-background)',
  color: 'var(--text-primary)',
  minHeight: '100vh',
} as const

const sectionStyles = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: 18,
  background: 'var(--surface)',
  display: 'grid',
  gap: 16,
} as const

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

export default function AdminPlayerLoginsPage() {
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [loginIdentities, setLoginIdentities] = useState<PlayerLoginIdentity[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingLoginId, setSavingLoginId] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [approvedEmail, setApprovedEmail] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)

  const availablePlayers = useMemo(
    () =>
      players.filter(
        (player) => player.is_active || loginIdentities.some((identity) => identity.player_id === player.id)
      ),
    [loginIdentities, players]
  )

  const loadPlayerLogins = useCallback(async () => {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/admin/player-logins', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load player login identities.')
      setLoading(false)
      return
    }

    setLoginIdentities(json.identities ?? [])
    setPlayers(json.players ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadPlayerLogins()
  }, [loadPlayerLogins])

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
    <main style={pageStyles}>
      <div className="pageShell">
        <div className="stickyHeader">
          <Nav />
        </div>
        <div className="admin-layout">
          <AdminSubNav />
          <div className="admin-content">
            <PageTitle>Admin: Player logins</PageTitle>
            <p>
              Step 2 creates or updates the <code>player_login_identities</code> row that says “this
              Google email belongs to this player.” New rows stay unlinked until the player signs in,
              so <code>auth_user_id</code> remains <code>null</code> at first.
            </p>

            {status ? <p>{status}</p> : null}

            <section style={sectionStyles}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Create approved Google login</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Use this to insert the expected Google email for a player before their first login.
                  The app saves <code>provider = google</code>, the selected <code>player_id</code>,
                  the email address, and the active flag. The linked auth user stays blank until sign-in
                  completes.
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
                  <span style={{ fontWeight: 600 }}>Google email</span>
                  <input
                    type="email"
                    value={approvedEmail}
                    onChange={(event) => setApprovedEmail(event.target.value)}
                    placeholder="newplayer@example.com"
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

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" onClick={() => void createPlayerLogin()} disabled={savingLoginId === 'new'}>
                  {savingLoginId === 'new' ? 'Saving...' : 'Save player login identity'}
                </button>
                <button type="button" className="btn--secondary" onClick={() => void loadPlayerLogins()}>
                  Refresh
                </button>
              </div>
            </section>

            <section style={sectionStyles}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Existing player login identities</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Review or update the Google email mapping for each player. Clearing the linked auth user
                  resets the association so the next successful login can link again.
                </p>
              </div>

              {loading ? <p>Loading approved player logins...</p> : null}

              {!loading ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Player</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Provider</th>
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
                          {identity.provider}
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
                          {identity.auth_user_id ?? 'null'}
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
                              Clear auth link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {loginIdentities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{ padding: '12px 6px', borderTop: '1px solid var(--border-subtle)' }}
                        >
                          No player login identities found yet.
                        </td>
                      </tr>
                    ) : null}
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
