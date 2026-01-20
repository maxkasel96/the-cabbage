'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Nav from '../../components/Nav'
import PageTitle from '../../components/PageTitle'
import PlayerBio from '../../components/players/PlayerBio'
import SeasonWinsList from '../../components/players/SeasonWinsList'
import StatCard from '../../components/players/StatCard'

type Player = {
  id: string
  display_name: string
  is_active: boolean
}

type SeasonWin = {
  id: string
  label: string
  wins: number
  yearStart?: number | null
  yearEnd?: number | null
}

type PlayerWinsResponse = {
  totalWins: number
  winsBySeason: SeasonWin[]
}

const placeholderBio =
  'A steadfast competitor in the Cabbage League, always ready for the next matchup. Bio details will be expanded soon.'

export default function PlayerDetailPage({ params }: { params: { playerId: string } }) {
  const playerId = params?.playerId
  const [player, setPlayer] = useState<Player | null>(null)
  const [wins, setWins] = useState<PlayerWinsResponse | null>(null)
  const [loadingPlayer, setLoadingPlayer] = useState(true)
  const [loadingWins, setLoadingWins] = useState(true)
  const [status, setStatus] = useState('')
  const [notFound, setNotFound] = useState(false)

  async function loadPlayer() {
    setLoadingPlayer(true)
    setStatus('')

    if (!playerId) {
      setNotFound(true)
      setLoadingPlayer(false)
      return
    }

    const res = await fetch(`/api/players/${playerId}`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (res.status === 404) {
      setNotFound(true)
      setLoadingPlayer(false)
      return
    }

    if (!res.ok) {
      setStatus(json.error || 'Failed to load player.')
      setLoadingPlayer(false)
      return
    }

    setPlayer(json.player)
    setLoadingPlayer(false)
  }

  async function loadWins() {
    setLoadingWins(true)

    if (!playerId) {
      setLoadingWins(false)
      return
    }

    const res = await fetch(`/api/players/${playerId}/wins`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load wins.')
      setWins({ totalWins: 0, winsBySeason: [] })
      setLoadingWins(false)
      return
    }

    setWins(json)
    setLoadingWins(false)
  }

  useEffect(() => {
    if (!playerId) {
      setNotFound(true)
      setLoadingPlayer(false)
      setLoadingWins(false)
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlayer()
    loadWins()
  }, [playerId])

  const totalWins = wins?.totalWins ?? 0
  const seasons = useMemo(() => wins?.winsBySeason ?? [], [wins])

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
        {notFound ? (
          <div className="player-error">
            <PageTitle>Player not found</PageTitle>
            <p>We couldn’t find that player in the archive.</p>
            <Link className="player-error__link" href="/players">
              Back to Players
            </Link>
          </div>
        ) : (
          <>
            <PageTitle>{loadingPlayer ? 'Loading player…' : player?.display_name ?? 'Player'}</PageTitle>
            {status && (
              <div className="players-status">
                <strong>{status}</strong>
              </div>
            )}
            <div className="player-detail">
              {loadingPlayer ? (
                <div className="player-bio player-bio--skeleton" aria-busy="true">
                  <div className="player-bio__skeleton-line" />
                  <div className="player-bio__skeleton-line" />
                  <div className="player-bio__skeleton-line player-bio__skeleton-line--short" />
                </div>
              ) : player ? (
                <PlayerBio name={player.display_name} bio={placeholderBio}>
                  <span className={`player-bio__status ${player.is_active ? 'player-bio__status--active' : 'player-bio__status--inactive'}`}>
                    {player.is_active ? 'Active' : 'Inactive'}
                  </span>
                </PlayerBio>
              ) : null}

              <section className="player-stats">
                <div className="player-stats__header">
                  <h2>Winning Statistics</h2>
                </div>
                {loadingWins ? (
                  <div className="player-stats__grid" aria-busy="true">
                    <div className="stat-card stat-card--skeleton" />
                  </div>
                ) : (
                  <div className="player-stats__grid">
                    <StatCard label="Total Wins" value={totalWins} />
                  </div>
                )}
                {loadingWins ? (
                  <div className="season-wins season-wins--skeleton" aria-busy="true">
                    <div className="season-wins__skeleton-row" />
                    <div className="season-wins__skeleton-row" />
                    <div className="season-wins__skeleton-row" />
                  </div>
                ) : (
                  <SeasonWinsList seasons={seasons} />
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
