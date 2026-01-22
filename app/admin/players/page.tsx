'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '@/app/components/Nav'
import AdminSubNav from '@/app/components/AdminSubNav'
import PageTitle from '@/app/components/PageTitle'
import AvatarUploader from '@/app/components/players/AvatarUploader'
import CardImageUploader from '@/app/components/players/CardImageUploader'

type Player = {
  id: string
  display_name: string
  is_active: boolean
  avatar_path?: string | null
  card_path?: string | null
  player_bio?: string | null
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingBioId, setSavingBioId] = useState<string | null>(null)

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

  async function savePlayerBio(player: Player) {
    if (savingBioId) return

    setSavingBioId(player.id)
    setStatus('')

    const res = await fetch(`/api/admin/players/${player.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_bio: player.player_bio ?? '' }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(json.error || `Failed to update bio for ${player.display_name}`)
      setSavingBioId(null)
      return
    }

    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, player_bio: json.player?.player_bio ?? player.player_bio } : p))
    )
    setStatus(`Saved bio for ${player.display_name}.`)
    setSavingBioId(null)
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
          <Nav showAdminMenu={false} />
        </div>
        <PageTitle>Admin: Players</PageTitle>
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
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <AvatarUploader
                      playerId={player.id}
                      playerName={player.display_name}
                      currentAvatarPath={player.avatar_path}
                      onUploadSuccess={(avatarPath) =>
                        setPlayers((prev) =>
                          prev.map((p) => (p.id === player.id ? { ...p, avatar_path: avatarPath } : p))
                        )
                      }
                    />
                    <CardImageUploader
                      playerId={player.id}
                      playerName={player.display_name}
                      currentCardPath={player.card_path}
                      onUploadSuccess={(cardPath) =>
                        setPlayers((prev) =>
                          prev.map((p) => (p.id === player.id ? { ...p, card_path: cardPath } : p))
                        )
                      }
                    />
                  </div>
                  <div style={{ minWidth: 220, flex: '1 1 240px' }}>
                    <div style={{ fontWeight: 700 }}>{player.display_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                      {player.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6 }}>
                      Bio
                    </label>
                    <textarea
                      value={player.player_bio ?? ''}
                      onChange={(e) =>
                        setPlayers((prev) =>
                          prev.map((p) => (p.id === player.id ? { ...p, player_bio: e.target.value } : p))
                        )
                      }
                      placeholder="Share a short bio…"
                      rows={3}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        padding: 8,
                        resize: 'vertical',
                        borderRadius: 6,
                        border: '1px solid var(--border-strong)',
                        background: 'var(--surface)',
                        color: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => savePlayerBio(player)}
                      disabled={savingBioId === player.id}
                      style={{
                        marginTop: 8,
                        padding: '6px 12px',
                        cursor: savingBioId === player.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {savingBioId === player.id ? 'Saving…' : 'Save bio'}
                    </button>
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
