'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'

type Winner = {
  id: string
  display_name: string
}

type HistoryRow = {
  id: string // play id
  game_id?: string
  name: string
  played_at: string
  winners: Winner[]
}

type ScoreRow = {
  player_id: string
  display_name: string
  wins: number
}

type Tournament = {
  id: string
  label: string
  year_start: number
  year_end: number
  is_active: boolean
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  // Tournament navigation
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('') // '' means "active" until loaded

  async function loadTournaments() {
    const res = await fetch('/api/tournaments', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load tournaments')
      return
    }

    const list: Tournament[] = json.tournaments ?? []
    setTournaments(list)

    // Default to active tournament (if we haven't selected anything yet)
    if (!selectedTournamentId) {
      const active = list.find((t) => t.is_active)
      if (active) setSelectedTournamentId(active.id)
    }
  }

  async function loadHistory(tournamentId?: string) {
    setLoading(true)
    setStatus('')

    const url = tournamentId
      ? `/api/history?tournamentId=${encodeURIComponent(tournamentId)}`
      : '/api/history'

    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load history')
      setHistory([])
      setLoading(false)
      return
    }

    setHistory(json.history ?? [])
    setLoading(false)
  }

  // Initial load: tournaments first (to pick an active), then history
  useEffect(() => {
    ;(async () => {
      await loadTournaments()
    })()
  }, [])

  // Whenever selected tournament changes, reload history for that tournament
  useEffect(() => {
    // If we haven't resolved a tournament yet, don't fetch
    if (!selectedTournamentId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory(selectedTournamentId)
  }, [selectedTournamentId])

  // Scoreboard: count wins by player across all history rows
  const scores = useMemo<ScoreRow[]>(() => {
    const map = new Map<string, ScoreRow>()

    for (const h of history) {
      for (const w of h.winners ?? []) {
        const existing = map.get(w.id)
        if (existing) {
          existing.wins += 1
        } else {
          map.set(w.id, { player_id: w.id, display_name: w.display_name, wins: 1 })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.wins - a.wins || a.display_name.localeCompare(b.display_name))
  }, [history])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return history

    return history.filter((h) => {
      const gameMatch = h.name.toLowerCase().includes(q)
      const winnerMatch = (h.winners ?? []).some((w) => w.display_name.toLowerCase().includes(q))
      return gameMatch || winnerMatch
    })
  }, [history, search])

  const selectedTournamentLabel =
    tournaments.find((t) => t.id === selectedTournamentId)?.label ||
    tournaments.find((t) => t.is_active)?.label ||
    'Active tournament'

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>History</h1>
      <Nav />

      {/* Tournament navigation */}
      {tournaments.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800 }}>Tournament year:</div>

          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            style={{ padding: '8px 10px' }}
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.year_start}-{t.year_end} {t.is_active ? '(Active)' : ''} — {t.label}
              </option>
            ))}
          </select>

          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Viewing: <strong>{selectedTournamentLabel}</strong>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div style={{ marginTop: 8, marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Scoreboard</div>

        {loading ? (
          <p>Loading…</p>
        ) : scores.length === 0 ? (
          <p style={{ opacity: 0.75 }}>No wins recorded yet.</p>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', maxWidth: 520 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                background: '#388e4a',
                padding: 10,
                fontWeight: 700,
              }}
            >
              <div>Player</div>
              <div>Wins</div>
            </div>

            {scores.map((s) => (
              <div
                key={s.player_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  padding: 10,
                  borderTop: '1px solid #eee',
                }}
              >
                <div>{s.display_name}</div>
                <div style={{ fontWeight: 700 }}>{s.wins}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search + controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search game or winner…"
          style={{ padding: 10, minWidth: 260 }}
        />

        <button
          onClick={() => {
            // refresh tournaments too, in case a new year was created
            loadTournaments()
            if (selectedTournamentId) loadHistory(selectedTournamentId)
            else loadHistory()
          }}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
        >
          Refresh
        </button>

        {status && (
          <span style={{ opacity: 0.85 }}>
            <strong>{status}</strong>
          </span>
        )}
      </div>

      {/* History list */}
      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No played games yet.</p>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', maxWidth: 820 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: 0,
              background: '#388e4a',
              padding: 10,
              fontWeight: 700,
            }}
          >
            <div>Game</div>
            <div>Winners</div>
            <div>Played</div>
          </div>

          {filtered.map((h) => {
            const winnersLabel =
              (h.winners ?? []).length === 0 ? '—' : h.winners.map((w) => w.display_name).join(', ')

            return (
              <div
                key={h.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  padding: 10,
                  borderTop: '1px solid #eee',
                }}
              >
                <div>{h.name}</div>
                <div style={{ opacity: 0.9 }}>{winnersLabel}</div>
                <div style={{ opacity: 0.75 }}>{new Date(h.played_at).toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}



