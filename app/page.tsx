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

export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [winnerPlayerId, setWinnerPlayerId] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  async function fetchPlayers() {
    const res = await fetch('/api/players')
    const json = await res.json()
    setPlayers(json.players ?? [])
  }

  async function rollRandom() {
    setStatus('')
    setWinnerPlayerId('')
    const res = await fetch('/api/random')
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
    // Auto-roll the next unplayed game
    await rollRandom()
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Board Game Picker</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button onClick={rollRandom} style={{ padding: '10px 14px', cursor: 'pointer' }}>
          Random game
        </button>
      </div>

      {status && (
        <p style={{ marginBottom: 16 }}>
          <strong>{status}</strong>
        </p>
      )}

      {!game ? (
        <p>Click “Random game” to get a recommendation.</p>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 520 }}>
          <h2 style={{ fontSize: 22, marginTop: 0 }}>{game.name}</h2>

          <p style={{ margin: '8px 0' }}>
            Players:{' '}
            {game.min_players && game.max_players
              ? `${game.min_players}–${game.max_players}`
              : '—'}
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
            <button onClick={rollRandom} style={{ padding: '10px 14px', cursor: 'pointer' }}>
              Roll again
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
