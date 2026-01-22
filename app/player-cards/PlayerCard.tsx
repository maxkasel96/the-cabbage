'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { getAvatarPublicUrl } from '@/lib/getAvatarPublicUrl'

type Player = {
  id: string
  display_name: string
  card_path?: string | null
  avatar_path?: string | null
}

type PlayerCardProps = {
  player: Player
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
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
            <img
              src={avatarUrl ?? 'path/to/user-logo.png'}
              alt={`${player.display_name} avatar`}
              className="absolute bottom-0 left-0 z-50 m-0 h-[9.05rem] w-[9.05rem] -rotate-10"
            />
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
