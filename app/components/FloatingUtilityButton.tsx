'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '@/app/hooks/useBodyScrollLock'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

const FLOATING_IMAGE_URL =
  'https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/il_1588xN.7325241583_mwao%20copy.png'

const modalTaglines = [
  "Let the cabbage decide.",
  "We now begin the ritual.",
  "Please rise for the selection of the unfortunate.",
  "Silence. The cabbage demands respect.",
  "And tonight’s sacrifice is…",
  "Fate is feeling petty tonight.",
  "The cabbage hungers.",
  "Spin the wheel of regret.",
  "Who’s about to have a bad time?",
  "Someone’s about to be mad.",
  "Draw straws, cowards.",
  "Let’s make this unfair.",
  "No one is safe.",
  "You knew this was coming.",
  "Who’s today’s cautionary tale?",
  "Time to identify the volunteer (non-consensual).",
  "Let’s crowdsource a bad decision.",
  "Someone’s about to get character development.",
  "Pick the main character of suffering.",
  "Who’s getting a plot twist they didn’t ask for?",
  "Choose your favorite future complaint.",
  "Who’s about to star in a minor tragedy?",
  "Select the sacrifice with confidence.",
  "The algorithm requires a loser.",
  "Step forward. Or don’t. It won’t matter.",
  "Let’s assign a problem.",
  "Someone’s night is about to get interesting.",
  "Time to consult the cabbage.",
  "The council will now decide your fate.",
  "Let’s see who the universe dislikes most.",
  "The cabbage requests a name.",
  "Let’s determine who suffers with purpose.",
  "Fate needs a volunteer. It won’t get one.",
  "The ritual requires a loser.",
  "Step into the spotlight (unfortunate).",
  "Who’s about to be narratively inconvenienced?",
  "Let’s pick someone to regret eye contact.",
  "The cabbage is feeling decisive.",
  "Time to assign a minor catastrophe.",
  "Who’s about to get volunteered aggressively?",
  "Let’s create a problem for someone else.",
  "The universe has a suggestion.",
  "Nominate someone for immediate inconvenience.",
  "Let’s see who destiny side-eyes.",
  "The selection process will now be unfair."
]

const resultTaglines = [
  "By order of the cabbage:",
  "This is your problem now:",
  "Congratulations, you’re it.",
  "Blame the algorithm:",
  "That’s your cue.",
  "Off you go.",
  "You volunteered (you didn’t):",
  "Move with purpose.",
  "Clock’s ticking, genius.",
  "Congratulations, you’ve been promoted to “problem”.",
  "This has your name all over it, unfortunately.",
  "Go do the thing you were hoping to avoid.",
  "You’re the chosen one (derogatory).",
  "Please proceed with minimal embarrassment.",
  "This feels like a “you” situation.",
  "Go perform your civic duty to the group.",
  "You’ve been selected for mild humiliation.",
  "Handle it like someone competent would.",
  "Time to earn your keep.",
  "The cabbage has issued a task.",
  "Step up. It’s too late to step back.",
  "You’ve been assigned a situation.",
  "Go make this everyone else’s non-problem.",
  "This is now canon.",
  "You’re up. Try not to make it worse.",
  "A responsibility has been forced upon you.",
  "Go justify your inclusion in the group.",
  "This one’s yours. Good luck with that.",
  "The burden finds you.",
  "Time to act like this was your idea.",
  "The cabbage chose. You’ll deal with it:",
  "This outcome has been assigned to you:",
  "Step forward. Yes, you:",
  "You’ve been selected. Try to seem okay with it:",
  "This is now your responsibility, tragically:",
  "The group has decided (without you):",
  "Go ahead. Be the solution:",
  "You’ve been handed the situation:",
  "Take this and make it everyone else’s problem:",
  "You’re up. No appeals:",
  "Time to contribute against your will:",
  "This task has bonded itself to you:",
  "Go handle this like you planned it:",
  "This is your arc now:",
  "Proceed. Confidence optional:"
]

const outcomeTaglines = [
  "Chosen by math, not mercy.",
  "Fair and unfortunate.",
  "The cabbage is drunk with power.",
  "Statistically, this was inevitable.",
  "Judgment from the produce aisle.",
  "The algorithm said “this one.”",
  "We ran the numbers. They chose you.",
  "The cabbage chose you out of spite.",
  "Fate was not kind.",
  "Democracy has failed you.",
  "This feels personal.",
  "Justice? No. But it is funny.",
  "The system works (against you).",
  "Blame statistics, not us.",
  "The universe shrugged and picked you.",
  "Nothing personal. Actually, it is.",
  "Cosmic indifference strikes again.",
  "This was always your destiny.",
  "Not rigged—just unfortunate for you.",
  "Fate rolled its eyes and picked you.",
  "The numbers whispered your name and laughed.",
  "An outcome that builds character (against your will).",
  "You’ve been selected for narrative tension.",
  "The algorithm saw you and said “perfect.”",
  "A humbling moment, delivered instantly.",
  "This will age poorly—for you.",
  "The cabbage has spoken. Regrettably.",
  "A statistically funny outcome.",
  "The odds did their worst.",
  "Destiny, but make it inconvenient.",
  "The cabbage found this funny.",
  "A deeply inconvenient probability.",
  "The outcome chose violence (lightly).",
  "Statistics said “why not you.”",
  "An avoidable outcome, somehow achieved.",
  "The universe made a choice. It wasn’t kind.",
  "The math has a sense of humor.",
  "A targeted inconvenience.",
  "The algorithm leaned your way (unfortunately).",
  "A questionable outcome, statistically valid.",
  "Destiny called. It picked you.",
  "The numbers aligned against you beautifully.",
  "A moment of growth you didn’t request.",
  "The cabbage endorses this chaos.",
  "An outcome with strong “you problem” energy."
]

type Player = {
  id: string
  display_name: string
}

type FloatingUtilityButtonProps = {
  className?: string
  tabIndex?: number
}

export default function FloatingUtilityButton({ className, tabIndex }: FloatingUtilityButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectionStatus, setSelectionStatus] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [modalTagline, setModalTagline] = useState('')
  const [resultTagline, setResultTagline] = useState('')
  const [outcomeTagline, setOutcomeTagline] = useState('')
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function logSelection(playerId: string) {
    try {
      await fetch('/api/player-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
    } catch (error) {
      console.warn('Failed to log player selection.', error)
    }
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useBodyScrollLock(isModalOpen)

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
    const supabase = supabaseBrowser()

    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(Boolean(data.user))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
    setSelectedPlayer(null)
    setIsSelecting(false)
    setResultTagline('')
    setOutcomeTagline('')
    setSelectionStatus(
      isAuthenticated ? '' : 'Sign in is required to harness the power of the cabbage.'
    )
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

    if (!isAuthenticated) {
      setSelectedPlayer(null)
      setSelectionStatus('Sign in is required to harness the power of the cabbage.')
      return
    }

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
      void logSelection(nextPlayer.id)
    }, 700)
  }

  return (
    <>
      <button
        type="button"
        className={['floating-utility-button', className].filter(Boolean).join(' ')}
        onClick={openModal}
        aria-label="Open utility modal"
        tabIndex={tabIndex}
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
                  className="modal-close"
                  onClick={closeModal}
                  aria-label="Close this nonsense"
                >
                  ✕
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
