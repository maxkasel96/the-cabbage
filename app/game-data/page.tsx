'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

type GameDataRow = {
  id: string
  name: string
  suggestionCount: number
  played: boolean
}

type Tournament = {
  id: string
  label: string
  year_start: number
  year_end: number
  is_active: boolean
}

type SortKey = 'suggestions' | 'played'
type SortDirection = 'asc' | 'desc'

export default function GameDataPage() {
  const [rows, setRows] = useState<GameDataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('suggestions')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')

  async function loadGameData(tournamentId?: string) {
    setLoading(true)
    setStatus('')

    const url = tournamentId
      ? `/api/game-data?tournamentId=${encodeURIComponent(tournamentId)}`
      : '/api/game-data'
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load game data')
      setRows([])
      setLoading(false)
      return
    }

    setRows(json.rows ?? [])
    setLoading(false)
  }

  async function loadTournaments() {
    const res = await fetch('/api/tournaments', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load tournaments')
      return
    }

    const list: Tournament[] = json.tournaments ?? []
    setTournaments(list)

    if (!selectedTournamentId) {
      const active = list.find((tournament) => tournament.is_active)
      if (active) setSelectedTournamentId(active.id)
    }
  }

  useEffect(() => {
    loadTournaments()
  }, [])

  useEffect(() => {
    if (!selectedTournamentId) return
    loadGameData(selectedTournamentId)
  }, [selectedTournamentId])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => row.name.toLowerCase().includes(query))
  }, [rows, search])

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows]
    sorted.sort((a, b) => {
      if (sortKey === 'suggestions') {
        const diff = a.suggestionCount - b.suggestionCount
        return sortDirection === 'asc' ? diff : -diff
      }

      if (a.played === b.played) {
        return a.name.localeCompare(b.name)
      }

      if (sortDirection === 'asc') {
        return a.played ? 1 : -1
      }

      return a.played ? -1 : 1
    })

    return sorted
  }, [filteredRows, sortDirection, sortKey])

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === 'played' ? 'desc' : 'desc')
  }

  const selectedTournamentLabel =
    tournaments.find((tournament) => tournament.id === selectedTournamentId)?.label ||
    tournaments.find((tournament) => tournament.is_active)?.label ||
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
      <div className="pageShell px-4 pb-12 pt-6 sm:px-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>GAME DATA</PageTitle>

        <section
          style={{
            marginTop: 20,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 16px 34px rgba(63, 90, 42, 0.12)',
          }}
        >
          <header style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Suggested Games</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
              Counts reflect how many times each game has been suggested to players in the selected tournament.
            </p>
          </header>

          {tournaments.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                border: '1px solid var(--border-strong)',
                background: 'var(--page-background)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Tournament year:</div>
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                style={{
                  minWidth: 220,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                }}
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.label || `${tournament.year_start}-${tournament.year_end}`}
                    {tournament.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Viewing: {selectedTournamentLabel}
              </span>
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Search games
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by game name"
                style={{
                  display: 'block',
                  marginTop: 6,
                  minWidth: 240,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--page-background)',
                  color: 'var(--text-primary)',
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sort by</span>
              <button
                type="button"
                onClick={() => toggleSort('suggestions')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border-strong)',
                  background: sortKey === 'suggestions' ? 'var(--primary)' : 'var(--surface)',
                  color: sortKey === 'suggestions' ? 'var(--text-inverse)' : 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                # of Times Suggested {sortKey === 'suggestions' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              <button
                type="button"
                onClick={() => toggleSort('played')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border-strong)',
                  background: sortKey === 'played' ? 'var(--primary)' : 'var(--surface)',
                  color: sortKey === 'played' ? 'var(--text-inverse)' : 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Played? {sortKey === 'played' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
            </div>
          </div>

          {status ? (
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(220, 53, 69, 0.12)', color: '#b91c1c' }}>
              {status}
            </div>
          ) : null}

          {loading ? (
            <p style={{ marginTop: 12 }}>Loading game data…</p>
          ) : sortedRows.length === 0 ? (
            <p style={{ marginTop: 12 }}>No game data available for the selected tournament.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: 12,
                  fontSize: 15,
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--divider-soft)' }}>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Game</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}># of Times Suggested</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Played?</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--divider-soft)' }}>
                      <td style={{ padding: '10px 8px' }}>{row.name}</td>
                      <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>
                        {row.suggestionCount}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          aria-label={row.played ? 'Marked as played' : 'Not marked as played'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            background: row.played ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.16)',
                            color: row.played ? '#15803d' : '#b91c1c',
                            fontWeight: 700,
                          }}
                        >
                          {row.played ? '✓' : '✕'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
