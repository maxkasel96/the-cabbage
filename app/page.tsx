'use client'

import { useEffect, useState } from 'react'

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

  const [winnerPlayerId, setWinnerPlayerId] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<Set<string>>(new Set())


  // Tracks which tag filter is currently active (null = no filter)
  const [activeTag, setActiveTag] = useState<string | null>(null)

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

  async function rollRandom() {
    setStatus('')
    setWinnerPlayerId('')

    const params = new URLSearchParams()
    if (selectedTagSlugs.size > 0) {
      params.set('tags', Array.from(selectedTagSlugs).join(','))
    }

    const res = await fetch(`/api/random?${params.toString()}`)
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

    const res = await fetch('/api/game/mark-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: game.id,
        winnerPlayerId: winnerPlayerId || null,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setStatus(json.error || 'Failed to mark as played')
      return
    }

    setStatus(`Marked as played: ${game.name}`)

    // Auto-roll the next unplayed game using the same active filter
    await rollRandom(activeTag)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers()
    fetchTags()
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Board Game Picker</h1>

      {/* Buttons */}

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
                  background: active ? '#222' : '#fff',
                  color: active ? '#fff' : '#000',
                  fontSize: 13,
                }}
              >
                {active ? '✓ ' : ''}
                {t.label}
              </button>
            )
          })}
        </div>

        {selectedTagSlugs.size > 0 && (
          <button
            onClick={() => setSelectedTagSlugs(new Set())}
            style={{
              marginTop: 8,
              fontSize: 12,
              background: 'none',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => rollRandom(null)}
          style={{
            padding: '10px 14px',
            cursor: 'pointer',
            border: activeTag === null ? '2px solid #000' : '1px solid #ddd',
          }}
          title="No filter"
        >
          Random game
        </button>

        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => rollRandom(t.slug)}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              border: activeTag === t.slug ? '2px solid #000' : '1px solid #ddd',
            }}
            title={t.slug}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {status && (
        <p style={{ marginBottom: 16 }}>
          <strong>{status}</strong>
        </p>
      )}

      {/* Active filter indicator */}
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
        Filter:{' '}
        <strong>
          {activeTag
            ? tags.find((t) => t.slug === activeTag)?.label ?? activeTag
            : 'None'}
        </strong>
      </p>

      {!game ? (
        <p>Click “Random game” or a tag to get a recommendation.</p>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 520 }}>
          <h2 style={{ fontSize: 22, marginTop: 0 }}>{game.name}</h2>

          <p style={{ margin: '8px 0' }}>
            Players:{' '}
            {game.min_players && game.max_players ? `${game.min_players}–${game.max_players}` : '—'}
          </p>

          <p style={{ margin: '8px 0' }}>
            Playtime: {game.playtime_minutes ? `${game.playtime_minutes} min` : '—'}
          </p>

          {game.notes && <p style={{ margin: '8px 0' }}>{game.notes}</p>}

          <div style={{ marginTop: 12 }}>
            <label>
              Winner:{' '}
              <select
                value={winnerPlayerId}
                onChange={(e) => setWinnerPlayerId(e.target.value)}
                style={{ padding: 6, marginLeft: 6 }}
              >
                <option value="">(none)</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <button onClick={markPlayed} style={{ padding: '10px 14px', cursor: 'pointer' }}>
              Mark as played
            </button>

            {/* Roll again respects the current filter */}
            <button onClick={() => rollRandom(activeTag)} style={{ padding: '10px 14px', cursor: 'pointer' }}>
              Roll again
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

