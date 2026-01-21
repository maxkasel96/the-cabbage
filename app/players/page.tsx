'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'
import PlayerCard from '../components/players/PlayerCard'

type Player = {
  id: string
  display_name: string
  is_active: boolean
  avatar_path?: string | null
}

export default function PlayersLandingPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  async function loadPlayers() {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/players/all', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load players')
      setPlayers([])
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
        <PageTitle>Players</PageTitle>
        <div className="players-intro">
          <p>Browse every saved player and explore their all-time cabbage victories.</p>
          {status && (
            <span className="players-status">
              <strong>{status}</strong>
            </span>
          )}
        </div>

        {loading ? (
          <div className="player-grid" aria-live="polite" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="player-card player-card--skeleton">
                <div className="player-card__avatar player-card__avatar--skeleton" />
                <div className="player-card__content">
                  <div className="player-card__skeleton-line" />
                  <div className="player-card__skeleton-pill" />
                </div>
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <p>No players found.</p>
        ) : (
          <div className="player-grid">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                id={player.id}
                name={player.display_name}
                isActive={player.is_active}
                avatarPath={player.avatar_path}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
