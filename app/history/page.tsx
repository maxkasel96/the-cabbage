'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/players/PlayerAvatar'

type Winner = {
  id: string
  display_name: string
  avatar_path?: string | null
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
  avatar_path?: string | null
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
          map.set(w.id, {
            player_id: w.id,
            display_name: w.display_name,
            wins: 1,
            avatar_path: w.avatar_path ?? null,
          })
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
        backgroundColor: 'var(--page-background)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      <div className="pageShell">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>The Annals</PageTitle>

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
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--text-primary)', flex: '0 0 auto' }}>
            Tournament year:
          </div>

          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--page-background)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              flex: '1 1 220px',
              minWidth: 0,
              maxWidth: 320,
              width: '100%',
            }}
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.year_start}-{t.year_end} {t.is_active ? '(Active)' : ''} — {t.label}
              </option>
            ))}
          </select>

          <div style={{ opacity: 0.75, fontSize: 13, color: 'var(--text-secondary)' }}>
            Viewing: <strong>{selectedTournamentLabel}</strong>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="scoreboard__title">
          <div className="scoreboard__title-badge">
            <span className="scoreboard__title-icon" aria-hidden="true">
              🥬
            </span>
            <span>Leaderboard</span>
          </div>
          <span className="scoreboard__season">{selectedTournamentLabel}</span>
        </div>

        {loading ? (
          <div className="scoreboard__frame">
            <div className="scoreboard__list" aria-live="polite" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="scoreboard__row scoreboard__row--skeleton">
                  <div className="scoreboard__rank">
                    <div className="scoreboard__skeleton-circle" />
                  </div>
                  <div className="scoreboard__avatar scoreboard__avatar--skeleton" />
                  <div className="scoreboard__player">
                    <div className="scoreboard__skeleton-line" />
                  </div>
                  <div className="scoreboard__wins scoreboard__wins--skeleton">
                    <div className="scoreboard__skeleton-pill" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : scores.length === 0 ? (
          <p style={{ opacity: 0.75 }}>No wins recorded yet.</p>
        ) : (
          <div className="scoreboard__frame">
            <div className="scoreboard__list" role="list">
              {scores.map((s, index) => {
                const rank = index + 1
                const medalClass =
                  rank === 1
                    ? 'scoreboard__medal--gold'
                    : rank === 2
                      ? 'scoreboard__medal--silver'
                      : rank === 3
                        ? 'scoreboard__medal--bronze'
                        : ''

                return (
                  <div
                    key={s.player_id}
                    className={`scoreboard__row ${rank <= 3 ? 'scoreboard__row--leader' : ''}`}
                    role="listitem"
                    tabIndex={0}
                  >
                    <div className="scoreboard__rank">
                      {rank <= 3 ? (
                        <div className={`scoreboard__medal ${medalClass}`} aria-label={`Rank ${rank}`}>
                          <span>{rank}</span>
                        </div>
                      ) : (
                        <div className="scoreboard__rank-badge" aria-label={`Rank ${rank}`}>
                          {rank}
                        </div>
                      )}
                    </div>
                    <PlayerAvatar
                      name={s.display_name}
                      avatarPath={s.avatar_path}
                      className="scoreboard__avatar"
                      size={42}
                    />
                    <div className="scoreboard__player">
                      <span>{s.display_name}</span>
                    </div>
                    <div className="scoreboard__wins" aria-label={`Wins: ${s.wins}`}>
                      <span className="scoreboard__wins-value">{s.wins}</span>
                      <span className="scoreboard__wins-label">Wins</span>
                    </div>
                  </div>
                )
              })}
            </div>
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
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search game or winner…"
          style={{
            padding: 10,
            minWidth: 260,
            background: 'var(--page-background)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
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
            background: 'var(--primary)',
            color: 'var(--text-inverse)',
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
        <>
          <div className="table-scroll-hint">
            <span className="table-scroll-hint__icon">↔</span>
            <span>Swipe to scroll the table</span>
          </div>
          <div
            className="table-scroll table-scroll-indicator"
            style={{
              borderRadius: 16,
              overflowX: 'auto',
              overflowY: 'hidden',
              maxWidth: 960,
              border: '2px solid var(--border-strong)',
              background: 'var(--surface)',
              boxShadow: '0 18px 40px rgba(63, 90, 42, 0.2)',
            }}
          >
            <div
              className="table-grid table-grid--history table-grid--header"
              style={{
                background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                padding: '12px 16px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'var(--text-inverse)',
                borderBottom: '2px solid var(--border-strong)',
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
                  className="table-grid table-grid--history table-grid--body"
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--divider-soft)',
                    alignItems: 'start',
                    background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{h.name}</div>
                  <div style={{ opacity: 0.9 }}>{winnersLabel}</div>
                  <div style={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>{h.notes ?? '—'}</div>
                  <div style={{ opacity: 0.75 }}>
                    {h.played_at ? new Date(h.played_at).toLocaleString() : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      </div>
    </main>
  )
}
