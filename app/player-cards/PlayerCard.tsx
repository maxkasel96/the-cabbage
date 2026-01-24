'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { getAvatarPublicUrl } from '@/lib/getAvatarPublicUrl'

type Player = {
  id: string
  display_name: string
  player_bio?: string | null
  card_path?: string | null
  avatar_path?: string | null
}

type TournamentWin = {
  id: string
  label: string
  wins: number
  losses: number
  cabbageDraws: number
}

type PlayerWinsResponse = {
  totalWins: number
  winsBySeason: TournamentWin[]
}

type PlayerCardProps = {
  player: Player
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [wins, setWins] = useState<PlayerWinsResponse | null>(null)
  const [winsStatus, setWinsStatus] = useState('')
  const [isWinsLoading, setIsWinsLoading] = useState(false)
  const imageUrl = useMemo(
    () => getAvatarPublicUrl(player.card_path ?? player.avatar_path),
    [player.card_path, player.avatar_path]
  )
  const avatarUrl = useMemo(
    () => getAvatarPublicUrl(player.avatar_path),
    [player.avatar_path]
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  function toggleFlip() {
    setIsFlipped((prev) => !prev)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleFlip()
    }
  }

  function openModal(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setIsModalOpen(true)
  }

  function closeModal(event?: React.MouseEvent) {
    event?.stopPropagation()
    setIsModalOpen(false)
  }

  async function loadWins() {
    setIsWinsLoading(true)
    setWinsStatus('')

    const res = await fetch(`/api/players/${player.id}/wins`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setWinsStatus(json.error || 'Failed to load wins.')
      setWins({ totalWins: 0, winsBySeason: [] })
      setIsWinsLoading(false)
      return
    }

    setWins(json)
    setIsWinsLoading(false)
  }

  useEffect(() => {
    if (!isModalOpen) return
    loadWins()
  }, [isModalOpen, player.id])

  const winsByTournament = wins?.winsBySeason ?? []
  const totalWins = wins?.totalWins ?? 0
  const totalLosses = winsByTournament.reduce((sum, season) => sum + season.losses, 0)
  const totalCabbageDraws = winsByTournament.reduce((sum, season) => sum + season.cabbageDraws, 0)

  const formatWinPercentage = (winsCount: number, lossesCount: number) => {
    const totalGames = winsCount + lossesCount
    if (totalGames === 0) return '—'
    return `${((winsCount / totalGames) * 100).toFixed(1)}%`
  }

  return (
    <div
      className="player-card-flip"
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={`Flip card for ${player.display_name}`}
    >
      <div className={`player-card-flip__inner ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="player-card-flip__face player-card-flip__face--front">
          <div
            className="absolute inset-0"
            style={{
              border: '6px solid #2e3f2a',
              boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              margin: '10px',
            }}
          >
            <img
              src="https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/ChatGPT%20Image%20Jan%2021,%202026,%2010_05_29%20PM.png"
              alt="Decorative banner"
              className="absolute left-1/2 top-[calc(var(--spacing)*-9)] z-10 w-full -translate-x-1/2"
            />
            <div className="absolute bottom-0 left-0 z-50 m-0 h-[9.05rem] w-[9.05rem] -rotate-10">
              <img
                src={avatarUrl ?? 'path/to/user-logo.png'}
                alt={`${player.display_name} avatar`}
                className="h-full w-full object-contain object-bottom"
              />
            </div>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`Player card for ${player.display_name}`}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                className="object-cover object-bottom"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-sm text-[color:var(--text-secondary)]">
                No card image available.
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 z-10 h-16 bg-[#2e3f2a] px-4 py-3 text-right text-white">
              <p className="text-base font-bold italic uppercase tracking-[0.2em] text-white/80">
                Position
              </p>
              <p className="text-2xl font-bold italic leading-tight">{player.display_name}</p>
            </div>
          </div>
        </div>
        <div className="player-card-flip__face player-card-flip__face--back">
          <div className="player-card-back">
            <p className="text-lg font-semibold">Player Stats</p>
            <button type="button" className="player-card-back__link" onClick={openModal}>
              Expanded stats
            </button>
          </div>
        </div>
      </div>
      {isModalOpen && isMounted
        ? createPortal(
            <div className="player-card-modal" role="dialog" aria-modal="true">
              <div className="player-card-modal__backdrop" onClick={closeModal} />
              <div
                className="player-card-modal__content"
                role="document"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-base font-semibold">Expanded stats</p>
                <section className="player-card-modal__bio" aria-label="Player biography">
                  <p className="player-card-modal__bio-title">Biography</p>
                  <p className="player-card-modal__bio-text">
                    {player.player_bio?.trim() ? player.player_bio : 'No biography available.'}
                  </p>
                </section>
                <div className="player-card-modal__table-hint">
                  <span className="player-card-modal__table-hint-icon">↔</span>
                  <span>Swipe to view more stats</span>
                </div>
                <div className="player-card-modal__table-scroll">
                  <table className="player-card-modal__table">
                    <thead>
                      <tr>
                        <th scope="col">Tournament</th>
                        <th scope="col">Wins</th>
                        <th scope="col">Losses</th>
                        <th scope="col">Win %</th>
                        <th scope="col"># of Cabbage Drawings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isWinsLoading ? (
                        <tr>
                          <td colSpan={5}>Loading stats...</td>
                        </tr>
                      ) : winsByTournament.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No stats recorded yet.</td>
                        </tr>
                      ) : (
                        winsByTournament.map((season) => (
                          <tr key={season.id}>
                            <td>{season.label}</td>
                            <td>{season.wins}</td>
                            <td>{season.losses}</td>
                            <td>{formatWinPercentage(season.wins, season.losses)}</td>
                            <td>{season.cabbageDraws}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row">Total</th>
                        <td>{totalWins}</td>
                        <td>{totalLosses}</td>
                        <td>{formatWinPercentage(totalWins, totalLosses)}</td>
                        <td>{totalCabbageDraws}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {winsStatus ? <p className="player-card-modal__status">{winsStatus}</p> : null}
                <button type="button" className="player-card-modal__close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
