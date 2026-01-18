'use client'

import { useEffect, useState } from 'react'
import Nav from './components/Nav'

type Game = {
  id: string
  name: string
  min_players: number | null
  max_players: number | null
  playtime_minutes: number | null
  notes: string | null
}

type Player = {
  id: string
  display_name: string
}

type Tag = {
  id: string
  slug: string
  label: string
  sort_order: number
}

export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [status, setStatus] = useState<string>('')

  // Multi-select tag filters (by slug)
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<Set<string>>(new Set())

  // Multi-select winners (by player id)
  const [winnerPlayerIds, setWinnerPlayerIds] = useState<Set<string>>(new Set())

  async function fetchPlayers() {
    const res = await fetch('/api/players')
    const json = await res.json()
    setPlayers(json.players ?? [])
  }

  async function fetchTags() {
    const res = await fetch('/api/tags')
    const json = await res.json()
    setTags(json.tags ?? [])
  }

  useEffect(() => {
    fetchPlayers()
    fetchTags()
  }, [])

  function toggleTag(slug: string) {
    setSelectedTagSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function clearFilters() {
    setSelectedTagSlugs(new Set())
  }

  function toggleWinner(playerId: string) {
    setWinnerPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function clearWinners() {
    setWinnerPlayerIds(new Set())
  }

  async function rollRandom() {
    setStatus('')
    setWinnerPlayerIds(new Set()) // reset winners for the newly rolled game

    const params = new URLSearchParams()
    if (selectedTagSlugs.size > 0) {
      params.set('tags', Array.from(selectedTagSlugs).join(','))
    }

    const url = params.toString() ? `/api/random?${params.toString()}` : '/api/random'
    const res = await fetch(url)
    const json = await res.json()

    if (!res.ok) {
      setGame(null)
      setStatus(json.message || json.error || 'Failed to fetch a game')
      return
    }

    setGame(json.game)
  }

  async function markPlayed() {
    if (!game) return
    setStatus('')

    const winnerIds = Array.from(winnerPlayerIds)

    const res = await fetch('/api/game/mark-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: game.id,
        winnerPlayerIds: winnerIds,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setStatus(json.error || 'Failed to mark as played')
      return
    }

    const winnerNames =
      winnerIds.length === 0
        ? null
        : winnerIds
            .map((id) => players.find((p) => p.id === id)?.display_name)
            .filter(Boolean)
            .join(', ')

    setStatus(
      winnerNames
        ? `Saved: ${game.name} (Winners: ${winnerNames}). View History to confirm.`
        : `Saved: ${game.name} (No winners selected). View History to confirm.`
    )

    // Auto-roll again with current filters
    await rollRandom()
  }

  const selectedLabels =
    selectedTagSlugs.size === 0
      ? 'None'
      : tags
          .filter((t) => selectedTagSlugs.has(t.slug))
          .map((t) => t.label)
          .join(', ')

  const selectedWinnersLabel =
    winnerPlayerIds.size === 0
      ? 'None'
      : players
          .filter((p) => winnerPlayerIds.has(p.id))
          .map((p) => p.display_name)
          .join(', ')

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Board Game Picker</h1>
      <Nav />

      {/* Tag filter chips */}
      {tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Filter by vibe:</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map((t) => {
              const active = selectedTagSlugs.has(t.slug)
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.slug)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                    background: active ? '#222' : '#388e4a',
                    color: active ? '#388e4a' : '#fff',
                    fontSize: 13,
                  }}
                  title={t.slug}
                >
                  {active ? '✓ ' : ''}
                  {t.label}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              <strong>Filters:</strong> {selectedLabels}
            </div>

            {selectedTagSlugs.size > 0 && (
              <button
                onClick={clearFilters}
                style={{
                  fontSize: 12,
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={rollRandom} style={{ padding: '10px 14px', cursor: 'pointer' }}>
          Random game
        </button>
        <button onClick={rollRandom} style={{ padding: '10px 14px', cursor: 'pointer' }}>
          Roll again
        </button>
      </div>

      {/* Status */}
      {status && (
        <p style={{ marginBottom: 16 }}>
          <strong>{status}</strong> <a href="/history">Open History</a>
        </p>
      )}

      {!game ? (
        <p>Click “Random game” to get a recommendation.</p>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 720 }}>
          <h2 style={{ fontSize: 22, marginTop: 0 }}>{game.name}</h2>

          <p style={{ margin: '8px 0' }}>
            Players:{' '}
            {game.min_players && game.max_players ? `${game.min_players}–${game.max_players}` : '—'}
          </p>

          <p style={{ margin: '8px 0' }}>
            Playtime: {game.playtime_minutes ? `${game.playtime_minutes} min` : '—'}
          </p>

          {game.notes && <p style={{ margin: '8px 0' }}>{game.notes}</p>}

          {/* Multi-winner picker */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Select winner(s):</div>

            <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
              {players.map((p) => (
                <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={winnerPlayerIds.has(p.id)}
                    onChange={() => toggleWinner(p.id)}
                  />
                  <span>{p.display_name}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
              <strong>Selected:</strong> {selectedWinnersLabel}
            </div>

            {winnerPlayerIds.size > 0 && (
              <button
                onClick={clearWinners}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear winners
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={markPlayed} style={{ padding: '10px 14px', cursor: 'pointer' }}>
              Mark as played
            </button>
            <button onClick={rollRandom} style={{ padding: '10px 14px', cursor: 'pointer' }}>
              Roll again
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
