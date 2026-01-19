'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'

type Winner = {
  id: string
  display_name: string
}

type HistoryRow = {
  id: string
  name: string
  played_at: string
  winners: Winner[]
  notes: string | null
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
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: '#061a12',
        color: '#f4f7fb',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: 0.6 }}>The Annals</h1>
      <Nav />

      {/* Tournament navigation */}
      {tournaments.length > 0 && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 14,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: 12,
            borderRadius: 12,
            background: '#0f2a1f',
            border: '1px solid rgba(74, 222, 128, 0.2)',
          }}
        >
          <div style={{ fontWeight: 800, color: '#e6edf8' }}>Tournament year:</div>

          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            style={{
              padding: '8px 12px',
              background: '#0b1f16',
              color: '#f4f7fb',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
            }}
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.year_start}-{t.year_end} {t.is_active ? '(Active)' : ''} — {t.label}
              </option>
            ))}
          </select>

          <div style={{ opacity: 0.75, fontSize: 13, color: '#cfe8d6' }}>
            Viewing: <strong>{selectedTournamentLabel}</strong>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div style={{ marginTop: 8, marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>Scoreboard</div>

        {loading ? (
          <p>Loading…</p>
        ) : scores.length === 0 ? (
          <p style={{ opacity: 0.75 }}>No wins recorded yet.</p>
        ) : (
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              maxWidth: 620,
              border: '2px solid #14532d',
              background: '#0a2016',
              boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                background: 'linear-gradient(90deg, #14532d, #0a2016)',
                padding: '12px 16px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#e7f8ed',
                borderBottom: '2px solid #4ade80',
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
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(74, 222, 128, 0.2)',
                  background: 'linear-gradient(90deg, rgba(6,26,18,0.95), rgba(8,32,22,0.85))',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  color: '#f8fafc',
                }}
              >
                <div>{s.display_name}</div>
                <div style={{ fontWeight: 700, color: '#4ade80' }}>{s.wins}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search + controls */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          padding: 12,
          borderRadius: 12,
          background: '#0f2a1f',
          border: '1px solid rgba(74, 222, 128, 0.2)',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search game or winner…"
          style={{
            padding: 10,
            minWidth: 260,
            background: '#0b1f16',
            color: '#f4f7fb',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: 8,
          }}
        />

        <button
          onClick={() => {
            // refresh tournaments too, in case a new year was created
            loadTournaments()
            if (selectedTournamentId) loadHistory(selectedTournamentId)
            else loadHistory()
          }}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            background: '#4ade80',
            color: '#062314',
            border: 'none',
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
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
        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            maxWidth: 960,
            border: '2px solid #14532d',
            background: '#0a2016',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 2fr 1fr',
              gap: 0,
              background: 'linear-gradient(90deg, #14532d, #0a2016)',
              padding: '12px 16px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#e7f8ed',
              borderBottom: '2px solid #4ade80',
            }}
          >
            <div>Game</div>
            <div>Winners</div>
            <div>Notes</div>
            <div>Played</div>
          </div>

          {filtered.map((h, index) => {
            const winnersLabel =
              (h.winners ?? []).length === 0 ? '—' : h.winners.map((w) => w.display_name).join(', ')

            return (
              <div
                key={h.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 2fr 1fr',
                  gap: 0,
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(74, 222, 128, 0.2)',
                  alignItems: 'start',
                  background:
                    index % 2 === 0
                      ? 'linear-gradient(90deg, rgba(6,26,18,0.95), rgba(8,32,22,0.85))'
                      : 'linear-gradient(90deg, rgba(8,32,22,0.95), rgba(10,40,26,0.85))',
                }}
              >
                <div style={{ fontWeight: 600 }}>{h.name}</div>
                <div style={{ opacity: 0.9 }}>{winnersLabel}</div>
                <div style={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>{h.notes ?? '—'}</div>
                <div style={{ opacity: 0.75 }}>{h.played_at ? new Date(h.played_at).toLocaleString() : '—'}</div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
