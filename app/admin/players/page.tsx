'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '@/app/components/Nav'
import AdminSubNav from '@/app/components/AdminSubNav'
import PageTitle from '@/app/components/PageTitle'

type Player = {
  id: string
  display_name: string
  is_active: boolean
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  async function loadPlayers() {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/admin/players')
    const json = await res.json()

    if (!res.ok) {
      setStatus(json.error || 'Failed to load players')
      setLoading(false)
      return
    }

    setPlayers(json.players ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlayers()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) => p.display_name.toLowerCase().includes(q))
  }, [players, search])

  const activeCount = players.filter((p) => p.is_active).length
  const inactiveCount = players.length - activeCount

  async function setPlayerActive(player: Player, nextActive: boolean) {
    if (savingId) return

    setSavingId(player.id)
    setStatus('')

    const res = await fetch(`/api/admin/players/${player.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: nextActive }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(json.error || `Failed to update ${player.display_name}`)
      setSavingId(null)
      return
    }

    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, is_active: json.player?.is_active ?? nextActive } : p))
    )
    setStatus(`${player.display_name} is now ${nextActive ? 'active' : 'inactive'}.`)
    setSavingId(null)
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
        <PageTitle>Admin: Players</PageTitle>
        <div className="stickyHeader">
          <Nav showAdminMenu={false} />
        </div>
        <AdminSubNav />

      <div style={{ marginBottom: 14, opacity: 0.8 }}>
        Active players appear as winner options on the homepage. Inactive players stay in history.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          style={{ padding: 10, minWidth: 260 }}
        />
        <button onClick={loadPlayers} style={{ padding: '10px 14px' }}>
          Refresh
        </button>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Active: <strong>{activeCount}</strong> • Inactive: <strong>{inactiveCount}</strong>
        </div>
        {status && (
          <span style={{ opacity: 0.85 }}>
            <strong>{status}</strong>
          </span>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No players found.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
          {filtered.map((player) => (
            <div
              key={player.id}
              style={{
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                background: 'var(--surface)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{player.display_name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {player.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={player.is_active}
                  onChange={(e) => setPlayerActive(player, e.target.checked)}
                  disabled={savingId === player.id}
                />
                <span>{player.is_active ? 'Active' : 'Inactive'}</span>
              </label>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  )
}
