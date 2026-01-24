'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const FLOATING_IMAGE_URL =
  'https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/il_1588xN.7325241583_mwao%20copy.png'

const modalTaglines = [
  'Choose your victim.',
  "Who's the go-fer boy this time?",
  'Let the cabbage decide.',
  "Don't draw yourself again, dumb ass",
  'And Tonight’s Sacrifice Is…',
  'We Now Begin the Ritual',
  'Please Rise for the Selection of the Unfortunate',
  'Someone’s About to Be Mad',
  'Silence. The Cabbage Demands Respect.',
  'Godspeed, You Moron',
  'Fuck Around & Find Out',
]

const resultTaglines = [
  'Go get my shit',
  'Time to get off your ass',
  'Move it or lose it',
  'This is your problem now:',
  'Up you go:',
  'Eyes open, legs working:',
  'By order of the cabbage:',
  'Cry later, walk now:',
  'Blame the algorithm:',
]

const outcomeTaglines = [
  'Chosen by Math, Not Mercy',
  'Fair and Unfortunate',
  'The Cabbage Is Drunk With Power',
  'Statistically, This Was Inevitable',
  'Science Demands It',
  'Judgment From the Produce Aisle',
  'Welp. That’s That.',
  'Sucks To Be You',
  'This App Actively Hates You',
  'The Algorithm Said “Fuck This Guy”',
  'We Ran the Numbers. They Hate You.',
  'The Cabbage Chose You Out of Spite',
]

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
  const [modalTagline, setModalTagline] = useState('')
  const [resultTagline, setResultTagline] = useState('')
  const [outcomeTagline, setOutcomeTagline] = useState('')
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
    const nextTagline = modalTaglines[Math.floor(Math.random() * modalTaglines.length)]
    setModalTagline(nextTagline)
    setIsModalOpen(true)
  }

  function closeModal(event?: React.MouseEvent) {
    event?.stopPropagation()
    setIsModalOpen(false)
    setSelectedPlayer(null)
    setSelectionStatus('')
    setIsSelecting(false)
    setResultTagline('')
    setOutcomeTagline('')
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
      const nextResultTagline = resultTaglines[Math.floor(Math.random() * resultTaglines.length)]
      const nextOutcomeTagline = outcomeTaglines[Math.floor(Math.random() * outcomeTaglines.length)]
      setSelectedPlayer(nextPlayer)
      setResultTagline(nextResultTagline)
      setOutcomeTagline(nextOutcomeTagline)
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
            <div className="player-card-modal floating-utility-modal" role="dialog" aria-modal="true">
              <div className="player-card-modal__backdrop" onClick={closeModal} />
              <div
                className="player-card-modal__content floating-utility-modal__content"
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
                <p className="text-base font-semibold floating-utility-modal__tagline">{modalTagline}</p>
                <div className="floating-utility-modal__picker">
                  <button
                    type="button"
                    className={`cabbage-roll-button ${isSelecting ? 'cabbage-roll-button--rolling' : ''}`}
                    onClick={handleShuffle}
                    disabled={isSelecting}
                  >
                    {isSelecting ? 'Choosing from the cabbage…' : 'Pick a player from the cabbage'}
                  </button>
                  {selectedPlayer ? (
                    <div className="floating-utility-modal__result">
                      <p className="text-base font-semibold">{resultTagline}</p>
                      <p className="floating-utility-modal__selected-player">
                        <strong>{selectedPlayer.display_name}</strong>
                      </p>
                      <p className="floating-utility-modal__outcome">{outcomeTagline}</p>
                    </div>
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
