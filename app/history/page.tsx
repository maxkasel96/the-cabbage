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
}

type ScoreRow = {
  player_id: string
  display_name: string
  wins: number
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  async function loadHistory() {
    setLoading(true)
    setStatus('')
    const res = await fetch('/api/history')
    const json = await res.json()

    if (!res.ok) {
      setStatus(json.error || 'Failed to load history')
      setLoading(false)
      return
    }

    setHistory(json.history ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory()
  }, [])

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

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>History</h1>
      <Nav />

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
        <button onClick={loadHistory} style={{ padding: '10px 14px', cursor: 'pointer' }}>
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


