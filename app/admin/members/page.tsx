'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/app/components/Nav'
import AdminSubNav from '@/app/components/AdminSubNav'
import PageTitle from '@/app/components/PageTitle'

type Roster = {
  currentUserId: string
  players: { id: string; display_name: string; is_active: boolean }[]
  memberships: { player_id: string; user_id: string | null; invited_email: string; is_active: boolean }[]
  accounts: { id: string; email: string; role: string; providers: string[]; lastSignIn?: string }[]
}

export default function MembersPage() {
  const [roster, setRoster] = useState<Roster | null>(null)
  const [email, setEmail] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Loading members…')
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/members', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to load members.')
    setRoster(data)
  }, [])
  useEffect(() => {
    load()
      .then(() => setStatus(''))
      .catch((error) => setStatus(error.message))
  }, [load])

  async function save(method: string, body: Record<string, unknown>, success: string) {
    setBusy(true)
    try {
      const response = await fetch('/api/admin/members', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      await load()
      if (!response.ok) throw new Error(result.error || 'Unable to save.')
      setStatus(success)
      if (method === 'POST') {
        setEmail('')
        setPlayerId('')
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save.')
    } finally {
      setBusy(false)
    }
  }

  const players = new Map(roster?.players.map((player) => [player.id, player]))
  const available = roster?.players.filter(
    (player) => player.is_active && !roster.memberships.some((m) => m.player_id === player.id),
  )
  return (
    <main className="pageShell px-4 pb-12 pt-6">
      <Nav />
      <PageTitle>Members</PageTitle>
      <AdminSubNav />
      <p role="status">{status}</p>
      {roster && (
        <>
          <h2>Approve a player</h2>
          <p>
            Save their Google account email, then share the{' '}
            <Link href="/auth/login" className="underline">player sign-in link</Link> with them.
          </p>
          <form
            className="flex flex-wrap gap-3 items-end my-4"
            onSubmit={(event) => {
              event.preventDefault()
              void save('POST', { email, playerId }, 'Google email approved.')
            }}
          >
            <label>
              Roster player{' '}
              <select required value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                <option value="">Choose a player</option>
                {available?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Google account email{' '}
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button disabled={busy || !playerId}>Approve email</button>
          </form>
          {roster.memberships.some((m) => !m.user_id) && (
            <section>
              <h2>Awaiting first sign-in</h2>
              {roster.memberships
                .filter((m) => !m.user_id)
                .map((m) => (
                  <div className="flex flex-wrap gap-3 my-3" key={m.player_id}>
                    <strong>{players.get(m.player_id)?.display_name}</strong> {m.invited_email}
                    <button
                      disabled={busy}
                      onClick={() => save('DELETE', { playerId: m.player_id }, 'Approval removed.')}
                    >
                      Remove approval
                    </button>
                  </div>
                ))}
            </section>
          )}
          <h2>Accounts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {['Player', 'Login email', 'Sign-in method', 'Last sign-in', 'Access', 'Role'].map(
                    (label) => (
                      <th className="p-2" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {roster.accounts.map((account) => {
                  const m = roster.memberships.find((row) => row.user_id === account.id)
                  const player = m && players.get(m.player_id)
                  const editable = !busy && account.id !== roster.currentUserId
                  return (
                    <tr key={account.id}>
                      <td className="p-2">{player?.display_name ?? 'Unlinked'}</td>
                      <td>{account.email}</td>
                      <td>{account.providers.join(', ')}</td>
                      <td>
                        {account.lastSignIn ? new Date(account.lastSignIn).toLocaleString() : 'Never'}
                      </td>
                      <td>
                        {m ? (
                          <>
                            {!player?.is_active
                              ? 'Roster inactive'
                              : m.is_active
                                ? 'Active'
                                : 'Disabled'}{' '}
                            <button
                              disabled={!editable}
                              onClick={() =>
                                save(
                                  'PATCH',
                                  { action: 'active', userId: account.id, active: !m.is_active },
                                  'Membership updated.',
                                )
                              }
                            >
                              {m.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </>
                        ) : account.role === 'admin' ? (
                          'Admin access'
                        ) : (
                          'No player access'
                        )}
                      </td>
                      <td>
                        <select
                          aria-label={`Role for ${account.email}`}
                          disabled={!editable}
                          value={account.role}
                          onChange={(e) => {
                            if (window.confirm(`Change the role for ${account.email}?`))
                              void save(
                                'PATCH',
                                { action: 'role', userId: account.id, role: e.target.value },
                                'Role updated.',
                              )
                          }}
                        >
                          <option value="standard">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
