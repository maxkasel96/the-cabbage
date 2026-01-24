'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const FLOATING_IMAGE_URL =
  'https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/il_1588xN.7325241583_mwao%20copy.png'

type Player = {
  id: string
  display_name: string
}

export default function FloatingUtilityButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectionStatus, setSelectionStatus] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isModalOpen) return
    let isActive = true

    async function fetchPlayers() {
      const res = await fetch('/api/players')
      const json = await res.json().catch(() => ({}))
      if (!isActive) return
      setPlayers(json.players ?? [])
    }

    fetchPlayers()

    return () => {
      isActive = false
    }
  }, [isModalOpen])

  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current)
      }
    }
  }, [])

  function openModal() {
    setIsModalOpen(true)
  }

  function closeModal(event?: React.MouseEvent) {
    event?.stopPropagation()
    setIsModalOpen(false)
    setSelectedPlayer(null)
    setSelectionStatus('')
    setIsSelecting(false)
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current)
      selectionTimerRef.current = null
    }
  }

  function handleShuffle() {
    if (isSelecting) return

    if (players.length === 0) {
      setSelectedPlayer(null)
      setSelectionStatus('No active players available.')
      return
    }

    setIsSelecting(true)
    setSelectionStatus('Shuffling the cabbage...')
    setSelectedPlayer(null)

    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current)
    }

    selectionTimerRef.current = setTimeout(() => {
      const nextPlayer = players[Math.floor(Math.random() * players.length)]
      setSelectedPlayer(nextPlayer)
      setSelectionStatus('')
      setIsSelecting(false)
    }, 700)
  }

  return (
    <>
      <button
        type="button"
        className="floating-utility-button"
        onClick={openModal}
        aria-label="Open utility modal"
      >
        <img src={FLOATING_IMAGE_URL} alt="Utility" className="floating-utility-button__image" />
      </button>
      {isModalOpen && isMounted
        ? createPortal(
            <div className="player-card-modal" role="dialog" aria-modal="true">
              <div className="player-card-modal__backdrop" onClick={closeModal} />
              <div
                className="player-card-modal__content"
                role="document"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="player-card-modal__close-icon"
                  onClick={closeModal}
                  aria-label="Close modal"
                >
                  ×
                </button>
                <p className="text-base font-semibold">Test</p>
                <div className="floating-utility-modal__picker">
                  <button
                    type="button"
                    className={`cabbage-roll-button ${isSelecting ? 'cabbage-roll-button--rolling' : ''}`}
                    onClick={handleShuffle}
                    disabled={isSelecting}
                  >
                    {isSelecting ? 'Choosing from the cabbage… 🥬' : 'Pick a player from the cabbage 🥬'}
                  </button>
                  {selectedPlayer ? (
                    <p className="floating-utility-modal__result">
                      Selected player: <strong>{selectedPlayer.display_name}</strong>
                    </p>
                  ) : null}
                  {selectionStatus ? (
                    <p className="floating-utility-modal__status">{selectionStatus}</p>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
