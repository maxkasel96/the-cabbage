'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import Nav from './components/Nav'
import PageTitle from './components/PageTitle'
import useBodyScrollLock from '@/app/hooks/useBodyScrollLock'

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

type Team = {
  id: number
  players: Player[]
}

export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [status, setStatus] = useState<string>('')

  // note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [marking, setMarking] = useState(false)
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false)
  const [winImageFiles, setWinImageFiles] = useState<File[]>([])
  const winImageInputRef = useRef<HTMLInputElement | null>(null)

  // Multi-select tag filters (by slug)
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<Set<string>>(new Set())

  const [playerCount, setPlayerCount] = useState('')

  // Multi-select winners (by player id)
  const [winnerPlayerIds, setWinnerPlayerIds] = useState<Set<string>>(new Set())

  const [gameStarted, setGameStarted] = useState(false)
  const [teamMode, setTeamMode] = useState<'individual' | 'teams' | ''>('')
  const [teamCount, setTeamCount] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [teamStatus, setTeamStatus] = useState('')
  const [showWinners, setShowWinners] = useState(false)
  const [winningTeamId, setWinningTeamId] = useState<number | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const explosionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useBodyScrollLock(noteModalOpen || welcomeModalOpen)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers()
    fetchTags()
  }, [])

  useEffect(() => {
    const hasSeenWelcome = window.localStorage.getItem('cabbageWelcomeSeen') === 'true'
    if (!hasSeenWelcome) {
      setWelcomeModalOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!showExplosion) return
    if (explosionTimerRef.current) {
      clearTimeout(explosionTimerRef.current)
    }
    explosionTimerRef.current = setTimeout(() => {
      setShowExplosion(false)
    }, 1200)

    return () => {
      if (explosionTimerRef.current) {
        clearTimeout(explosionTimerRef.current)
      }
    }
  }, [showExplosion])

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

  function resetWinImage() {
    setWinImageFiles([])
    if (winImageInputRef.current) {
      winImageInputRef.current.value = ''
    }
  }

  function resetRecommendation() {
    setGame(null)
    setGameStarted(false)
    setTeamMode('')
    setTeamCount('')
    setTeams([])
    setTeamStatus('')
    setShowWinners(false)
    setWinningTeamId(null)
    setWinnerPlayerIds(new Set())
    setIsRolling(false)
    resetWinImage()
  }

  // Random roll animation helper
  const [isRolling, setIsRolling] = useState(false)
  const [rollKey, setRollKey] = useState(0)
  const rollButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!game || isRolling) return
    const button = rollButtonRef.current
    if (!button) return
    button.animate(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.08) rotate(-3deg)' },
        { transform: 'scale(0.98) rotate(2deg)' },
        { transform: 'scale(1.04) rotate(-1deg)' },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 600, easing: 'ease-out' }
    )
  }, [game, isRolling])

  async function rollRandom() {
  if (isRolling) return

  setStatus('')
  setWinnerPlayerIds(new Set())
  setGameStarted(false)
  setTeamMode('')
  setTeamCount('')
  setTeams([])
  setTeamStatus('')
  setShowWinners(false)
  setWinningTeamId(null)
  setIsRolling(true)

  // Let the “rolling” animation be visible before the fetch resolves
  await new Promise((r) => setTimeout(r, 350))

  const params = new URLSearchParams()
  if (selectedTagSlugs.size > 0) {
    params.set('tags', Array.from(selectedTagSlugs).join(','))
  }
  const trimmedPlayerCount = playerCount.trim()
  if (trimmedPlayerCount) {
    params.set('maxPlayers', trimmedPlayerCount)
  }

  const url = params.toString() ? `/api/random?${params.toString()}` : '/api/random'
  const res = await fetch(url)
  const json = await res.json()

  if (!res.ok) {
    setGame(null)
    setStatus(json.message || json.error || 'Failed to fetch a game')
    setIsRolling(false)
    return
  }

  setGame(json.game)
  setRollKey((k) => k + 1) // retrigger pop animation
  setIsRolling(false)
}

  function startGame() {
    if (!game) return
    setGameStarted(true)
    setTeamMode('')
    setTeamCount('')
    setTeams([])
    setTeamStatus('')
    setWinnerPlayerIds(new Set())
    setShowWinners(false)
    setWinningTeamId(null)
  }

  function handleTeamModeChange(mode: 'individual' | 'teams') {
    setTeamMode(mode)
    setTeams([])
    setTeamStatus('')
    setShowWinners(false)
    setWinningTeamId(null)
    if (mode === 'individual') {
      setTeamStatus('Individual play selected. No teams will be generated.')
      setShowWinners(true)
    }
  }

  function generateTeams() {
    const count = Number(teamCount)
    if (!Number.isFinite(count) || count <= 0) {
      setTeamStatus('Enter a valid number of teams.')
      setTeams([])
      return
    }
    if (players.length === 0) {
      setTeamStatus('No active players available.')
      setTeams([])
      return
    }

    const teamList: Team[] = Array.from({ length: count }, (_, idx) => ({
      id: idx + 1,
      players: [],
    }))

    players.forEach((player, index) => {
      teamList[index % count].players.push(player)
    })

    setTeams(teamList)
    setTeamStatus(`Generated ${count} team${count === 1 ? '' : 's'} from ${players.length} active players.`)
    setShowWinners(true)
    setWinningTeamId(null)
  }

  function selectWinningTeam(teamId: number) {
    const selectedTeam = teams.find((team) => team.id === teamId)
    setWinningTeamId(teamId)
    setWinnerPlayerIds(new Set(selectedTeam?.players.map((player) => player.id) ?? []))
  }

  function resolveParticipantIds() {
    const roster =
      teamMode === 'teams' && teams.length > 0
        ? teams.flatMap((team) => team.players)
        : players
    return Array.from(new Set(roster.map((player) => player.id)))
  }

  async function markPlayed() {
    if (!game) return
    setStatus('')
    setNoteDraft('')
    resetWinImage()
    setNoteModalOpen(true)

    const winnerIds = Array.from(winnerPlayerIds)
    const participantIds = resolveParticipantIds()

    const res = await fetch('/api/game/mark-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: game.id,
        winnerPlayerIds: winnerIds,
        participantPlayerIds: participantIds,
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

    resetRecommendation()
  }

  function openMarkPlayedModal() {
    if (!game) return
    setStatus('')
    setNoteDraft('')
    resetWinImage()
    setNoteModalOpen(true)
  }

  function handleWinImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    setWinImageFiles((prev) => {
      const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`))
      const nextFiles = files.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`
        if (existingKeys.has(key)) return false
        existingKeys.add(key)
        return true
      })
      return [...prev, ...nextFiles]
    })
    if (winImageInputRef.current) {
      winImageInputRef.current.value = ''
    }
  }

  function removeWinImage(index: number) {
    setWinImageFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      if (next.length === 0 && winImageInputRef.current) {
        winImageInputRef.current.value = ''
      }
      return next
    })
  }

  function closeWelcomeModal() {
    window.localStorage.setItem('cabbageWelcomeSeen', 'true')
    setWelcomeModalOpen(false)
  }

  // Function for saving note and closing modal
  async function confirmMarkPlayed() {
    if (!game) return
    if (marking) return

    const winnerIds = Array.from(winnerPlayerIds)
    if (winImageFiles.length > 0 && winnerIds.length === 0) {
      setStatus('Please select at least one winner to attach an image.')
      return
    }

    setMarking(true)
    setShowExplosion(true)
    setStatus('')

    const note = noteDraft.trim()
    const participantIds = resolveParticipantIds()

    const requestInit: RequestInit = winImageFiles.length > 0
      ? (() => {
          const formData = new FormData()
          formData.append('gameId', game.id)
          formData.append('winnerPlayerIds', JSON.stringify(winnerIds))
          formData.append('participantPlayerIds', JSON.stringify(participantIds))
          if (note.length) {
            formData.append('note', note)
          }
          winImageFiles.forEach((file) => {
            formData.append('winImages', file)
          })
          return {
            method: 'POST',
            body: formData,
          }
        })()
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            winnerPlayerIds: winnerIds,
            participantPlayerIds: participantIds,
            note: note.length ? note : null,
          }),
        }

    const res = await fetch('/api/game/mark-played', requestInit)

    const json = await res.json()
    if (!res.ok) {
      setStatus(json.error || 'Failed to mark as played')
      setMarking(false)
      return
    }

    setNoteModalOpen(false)
    setMarking(false)
    resetWinImage()

    setStatus(`Saved: ${game.name}. View History to confirm.`)

    resetRecommendation()
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
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: 'var(--page-background)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      {showExplosion ? (
        <div className="explosionOverlay" aria-hidden="true">
          <div className="explosionCore" />
          <div className="explosionRing" />
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="explosionSpark"
              style={
                {
                  '--spark-rotate': `${index * 30}deg`,
                  '--spark-delay': `${index * 0.03}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}

      {/* rolling an animation */}
      <style>{`
        .mainLayout {
          display: grid;
          gap: 24px;
          grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.4fr);
          align-items: start;
          margin-top: 24px;
        }

        .sectionTitle {
          font-size: 18px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sectionSubtitle {
          font-size: 13px;
          opacity: 0.7;
          margin-top: 2px;
        }

        .filtersHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filtersMeta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        @keyframes shake {
          0% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-6px) rotate(-1deg); }
          40% { transform: translateX(6px) rotate(1deg); }
          60% { transform: translateX(-4px) rotate(-1deg); }
          80% { transform: translateX(4px) rotate(1deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }

        @keyframes pop {
          0% { transform: scale(0.98); opacity: 0.2; }
          60% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes cabbageBounce {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.08) rotate(-3deg); }
          55% { transform: scale(0.98) rotate(2deg); }
          80% { transform: scale(1.04) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes leafUnfurl {
          0% { transform: scale(1); }
          50% { transform: scale(1.04) rotate(-1deg); }
          100% { transform: scale(0.98); }
        }

        .rollBtn {
          transition: transform 120ms ease, opacity 120ms ease;
          background: var(--primary);
          color: var(--text-inverse);
          border: none;
          border-radius: 16px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 20px rgba(63, 90, 42, 0.2);
          width: 100%;
        }
        .rollBtn:active {
          animation: leafUnfurl 220ms ease-out;
        }
        .rollBtn:hover {
          transform: translateY(-1px) scale(1.01);
        }
        .rollBtnRolling {
          animation: shake 420ms ease-in-out;
        }
        .rollBtnSelected {
          animation: cabbageBounce 600ms ease-out;
        }

        .gameCardPop {
          animation: pop 220ms ease-out;
        }

        .gameCardRolling {
          animation: shake 420ms ease-in-out;
          filter: blur(0.6px);
          opacity: 0.85;
        }

        .noteTextarea::placeholder {
          color: rgba(79, 55, 32, 0.6);
        }
        
        .noteTextarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(89, 60, 33, 0.35);
          background: var(--page-background);
          color: #4b331c;
          box-shadow: inset 0 1px 3px rgba(61, 38, 18, 0.2);
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.6;
        }
        
        .markPlayedModal {
          position: relative;
          z-index: 1;
          background-color: #f8f7f0;
          color: #2e3f2a;
          padding: 24px;
          border-radius: 12px;
          width: 600px;
          max-width: 90vw;
          max-height: 85vh;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: center;
          overflow-y: auto;
        }

        .markPlayedModalInner {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .markPlayedModalTitle {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: var(--text-primary);
        }

        .markPlayedModalSubtitle {
          opacity: 0.9;
          color: var(--text-secondary);
        }

        .markPlayedModalHint {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .markPlayedModalField {
          margin-top: 16px;
          display: grid;
          gap: 6px;
        }

        .markPlayedModalLabel {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .markPlayedModalFileInput {
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: var(--page-background);
          color: var(--text-primary);
          font-family: var(--font-geist-sans);
        }

        .markPlayedModalFileMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
          padding: 8px 10px;
          border-radius: 10px;
          background: var(--surface);
          border: 1px solid var(--divider-soft);
        }

        .markPlayedModalFileList {
          display: grid;
          gap: 8px;
        }

        .markPlayedModalFileRemove {
          border: none;
          background: transparent;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
        }

        .markPlayedModalFileClear {
          align-self: flex-start;
          border: none;
          background: transparent;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
        }

        .markPlayedModalClose {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 600;
        }

        .markPlayedModalPrimary {
          padding: 10px 14px;
          cursor: pointer;
          border-radius: 999px;
          border: none;
          background: var(--primary);
          color: var(--text-inverse);
          font-weight: 700;
        }

        .markPlayedModalSecondary {
          padding: 10px 14px;
          cursor: pointer;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          background: var(--page-background);
          color: var(--text-primary);
          font-weight: 700;
        }

        .filtersCard {
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 16px 34px rgba(63, 90, 42, 0.2);
          color: var(--text-primary);
        }

        .chip {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.2px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--page-background);
          color: var(--text-primary);
          transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
        }

        .chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px rgba(63, 90, 42, 0.2);
        }

        .chipActive {
          background: var(--secondary);
          color: var(--text-inverse);
          border-color: var(--primary);
          box-shadow: 0 8px 16px rgba(63, 90, 42, 0.2);
        }

        .filtersSummary {
          background: var(--page-background);
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px dashed var(--divider-soft);
          font-size: 13px;
          color: var(--text-primary);
        }

        .filtersCount {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--surface-alt);
          border: 1px solid var(--border-strong);
          font-weight: 700;
        }

        .playersInput {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          font-size: 14px;
          width: 140px;
          background: var(--page-background);
          color: var(--text-primary);
          box-shadow: inset 0 1px 2px rgba(63, 90, 42, 0.2);
        }

        .playersInput::placeholder {
          color: rgba(63, 90, 42, 0.55);
        }

        .resultCard {
          border-radius: 18px;
          padding: 20px;
          background: var(--surface);
          border: 2px solid var(--border-strong);
          box-shadow: 0 18px 40px rgba(63, 90, 42, 0.25);
          position: relative;
          overflow: hidden;
          color: var(--text-primary);
        }

        .resultCard::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(255,255,255,0.25), transparent 45%),
            radial-gradient(circle at 20% 20%, rgba(63, 90, 42, 0.15), transparent 50%);
          pointer-events: none;
        }

        .resultBadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--primary);
          color: var(--text-inverse);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .statRow {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 10px 0 6px;
        }

        .statPill {
          background: var(--page-background);
          border: 1px solid var(--border-strong);
          border-radius: 12px;
          padding: 8px 12px;
          font-weight: 600;
          display: inline-flex;
          gap: 6px;
          align-items: center;
          color: var(--text-primary);
        }

        .markPlayedButton {
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: var(--text-inverse);
          border: none;
          border-radius: 999px;
          padding: 12px 20px;
          font-weight: 700;
          letter-spacing: 0.3px;
          box-shadow: 0 12px 20px rgba(63, 90, 42, 0.25);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .markPlayedButton:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 16px 28px rgba(63, 90, 42, 0.3);
        }

        .markPlayedButton:active {
          transform: scale(0.98);
        }

        .startGameButton {
          background: var(--primary);
          color: var(--text-inverse);
          border: none;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 20px rgba(63, 90, 42, 0.2);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .startGameButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 24px rgba(63, 90, 42, 0.24);
        }

        .teamPanel {
          margin-top: 16px;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          background: var(--page-background);
        }

        .teamGrid {
          display: grid;
          gap: 12px;
          margin-top: 10px;
        }

        .teamCard {
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          padding: 10px 12px;
          background: var(--surface);
          box-shadow: 0 10px 18px rgba(63, 90, 42, 0.14);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .teamCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 24px rgba(63, 90, 42, 0.2);
        }

        .teamBadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          padding: 4px 10px;
          background: var(--surface-alt);
        }

        .winnerTeamGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
          margin-top: 8px;
        }

        .winnerTeamCard {
          border-radius: 14px;
          border: 1px solid #9eaa86;
          padding: 10px 12px;
          background: #e7eadb;
          display: grid;
          gap: 8px;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
        }

        .winnerTeamCard:hover {
          transform: translateY(-1px);
          border-color: #4a5a3c;
          box-shadow: 0 10px 20px rgba(63, 90, 42, 0.18);
          background: #d5dcc2;
        }

        .winnerTeamCardActive {
          border-color: #1c2518;
          box-shadow: 0 10px 24px rgba(30, 37, 24, 0.3);
          background: #3f5a32;
          border-left: 6px solid #d2b45a;
          padding-left: 6px;
        }

        .winnerTeamCardActive:hover {
          border-color: #10160d;
          background: #2e4526;
          box-shadow: 0 6px 16px rgba(18, 24, 14, 0.35);
        }

        .winnerTeamCardDim {
          opacity: 0.85;
        }

        .winnerTeamTitle {
          font-weight: 700;
          color: #4a5a3c;
        }

        .winnerTeamTitleActive {
          color: #f3f5ec;
        }

        .winnerTeamMeta {
          font-size: 12px;
          color: #7a8a67;
        }

        .winnerTeamMetaActive {
          color: #dce3d2;
        }

        .winnerTeamPlayers {
          font-size: 12px;
          color: #5a6a4c;
        }

        .winnerTeamPlayersActive {
          color: rgba(243, 245, 236, 0.85);
        }

        .winnerTeamRadio {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 2px solid #9eaa86;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }

        .winnerTeamRadioActive {
          background: #f3f5ec;
          border-color: #f3f5ec;
        }

        .winnerTeamRadioDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: transparent;
        }

        .winnerTeamRadioDotActive {
          background: #2e3f2a;
        }

        .winnerTeamTrophy {
          color: #d2b45a;
          font-size: 18px;
        }

        .selectedWinnersLabel {
          color: #5a4a2e;
        }

        .selectedWinnersNames {
          color: #1c2518;
        }

        .clearWinnersButton {
          margin-top: 6px;
          font-size: 12px;
          background: none;
          border: none;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          color: #4a5a3c;
        }

        .clearWinnersButton:hover {
          color: #2e3f2a;
        }

        .sectionCard {
          display: grid;
          gap: 16px;
        }

        @media (max-width: 960px) {
          .mainLayout {
            grid-template-columns: 1fr;
          }

          .stickyHeader {
            position: relative;
            top: auto;
          }
        }
      `}</style>

      <div className="pageShell px-4 pb-12 pt-6 sm:px-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>The Game Cabbage</PageTitle>

        <div className="mainLayout">
          <section className="filtersCard">
            <div className="filtersHeader">
              <div>
                <div className="sectionTitle">🥬 Find Your Game</div>
                <div className="sectionSubtitle">Choose your vibe to guide the cabbage.</div>
              </div>
              <div className="filtersMeta">
                <div className="filtersCount">Active filters: {selectedTagSlugs.size}</div>
                <div className="filtersSummary">
                  <strong>Filters:</strong> {selectedLabels}
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {tags.map((t) => {
                  const active = selectedTagSlugs.has(t.slug)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.slug)}
                      className={`chip ${active ? 'chipActive' : ''}`}
                      title={t.slug}
                    >
                      <span>{active ? '✨' : '•'}</span>
                      {t.label}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600 }}>Number of players</div>
              <input
                className="playersInput"
                type="number"
                min={1}
                value={playerCount}
                onChange={(event) => setPlayerCount(event.target.value)}
                placeholder="e.g., 4"
              />
              <div style={{ fontSize: 12, opacity: 0.7 }}>Leave blank to ignore player count.</div>
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
                    color: 'var(--text-muted)',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <button
              onClick={rollRandom}
              ref={rollButtonRef}
              disabled={isRolling}
              className={`rollBtn ${isRolling ? 'rollBtnRolling' : ''}`}
              style={{
                padding: '16px 26px',
                cursor: isRolling ? 'not-allowed' : 'pointer',
                opacity: isRolling ? 0.75 : 1,
                fontSize: 18,
                marginTop: 16,
              }}
            >
              {isRolling ? 'Choosing from the cabbage… 🥬' : 'Pick a game from the cabbage 🥬'}
            </button>
          </section>

          <section className="sectionCard">
            <div>
              <div className="sectionTitle">🎮 Game Setup & Results</div>
              <div className="sectionSubtitle">Configure, shuffle, and celebrate the winners.</div>
            </div>

            {status && (
              <p style={{ marginBottom: 16 }}>
                <strong>{status}</strong>{' '}
                <a href="/history" style={{ color: 'var(--primary)' }}>
                  Open History
                </a>
              </p>
            )}

            {!game ? (
              <div className="resultCard">
                <div className="resultBadge">✨ Awaiting a game</div>
                <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>
                  Let the cabbage take the guessing out of things. Choose Find My Game to get rolling.
                </p>
              </div>
            ) : (
              <div key={rollKey} className={isRolling ? 'gameCardRolling' : 'gameCardPop'}>
                <div className="resultCard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div className="resultBadge">✨ Fresh from the cabbage</div>
                    <div style={{ fontSize: 12, opacity: 0.7, color: 'var(--text-secondary)' }}>
                      Ready when you are
                    </div>
                  </div>
                  <h2 style={{ fontSize: 24, marginTop: 12, marginBottom: 6 }}>{game.name}</h2>

                  <div className="statRow">
                    <div className="statPill">
                      👥 Players: {game.min_players && game.max_players ? `${game.min_players}–${game.max_players}` : '—'}
                    </div>
                    <div className="statPill">
                      ⏱️ Playtime: {game.playtime_minutes ? `${game.playtime_minutes} min` : '—'}
                    </div>
                  </div>

                  {game.notes && (
                    <p style={{ margin: '8px 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      {game.notes}
                    </p>
                  )}

                  {!gameStarted && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                      <button onClick={startGame} className="startGameButton" style={{ cursor: 'pointer' }}>
                        Play this game ▶
                      </button>
                    </div>
                  )}

                  {gameStarted && (
                    <div className="teamPanel">
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>🔀 Team Setup</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input
                            type="radio"
                            name="team-mode"
                            checked={teamMode === 'individual'}
                            onChange={() => handleTeamModeChange('individual')}
                          />
                          <span>Individual (no teams)</span>
                        </label>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input
                            type="radio"
                            name="team-mode"
                            checked={teamMode === 'teams'}
                            onChange={() => handleTeamModeChange('teams')}
                          />
                          <span># of teams required</span>
                        </label>
                        {teamMode === 'teams' && (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              className="playersInput"
                              type="number"
                              min={1}
                              value={teamCount}
                              onChange={(event) => setTeamCount(event.target.value)}
                              placeholder="e.g., 3"
                            />
                            <button
                              onClick={generateTeams}
                              className="startGameButton"
                              style={{ cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}
                            >
                              🔄 Generate teams
                            </button>
                          </div>
                        )}
                      </div>

                      {teamStatus && (
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{teamStatus}</div>
                      )}

                      {teams.length > 0 && (
                        <div className="teamGrid">
                          {teams.map((team) => (
                            <div key={team.id} className="teamCard">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 700 }}>Team {team.id}</div>
                                <span className="teamBadge">Players: {team.players.length}</span>
                              </div>
                              {team.players.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                                  No players assigned.
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                                  {team.players.map((player) => (
                                    <div key={player.id}>{player.display_name}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {showWinners && (
                    <>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>🏆 Select Winner(s)</div>

                        {teamMode === 'teams' && teams.length > 0 ? (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Choose a winning team
                            </div>
                            <div className="winnerTeamGrid">
                              {teams.map((team) => {
                                const isActive = winningTeamId === team.id
                                const dimWhenUnselected = winningTeamId !== null && !isActive
                                return (
                                  <button
                                    key={team.id}
                                    type="button"
                                    className={`winnerTeamCard ${isActive ? 'winnerTeamCardActive' : ''} ${
                                      dimWhenUnselected ? 'winnerTeamCardDim' : ''
                                    }`}
                                    onClick={() => selectWinningTeam(team.id)}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div className={`winnerTeamTitle ${isActive ? 'winnerTeamTitleActive' : ''}`}>
                                          Team {team.id}
                                        </div>
                                        <div className={`winnerTeamMeta ${isActive ? 'winnerTeamMetaActive' : ''}`}>
                                          {team.players.length} player{team.players.length === 1 ? '' : 's'}
                                        </div>
                                      </div>
                                      <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                                        {!isActive && (
                                          <div className="winnerTeamRadio">
                                            <span className="winnerTeamRadioDot" />
                                          </div>
                                        )}
                                        {isActive && <div className="winnerTeamTrophy">🏆</div>}
                                      </div>
                                    </div>
                                    <div
                                      className={`winnerTeamPlayers ${isActive ? 'winnerTeamPlayersActive' : ''}`}
                                    >
                                      {team.players.length > 0
                                        ? team.players.map((player) => player.display_name).join(' • ')
                                        : 'No players assigned'}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
                            {players.map((p) => (
                              <label
                                key={p.id}
                                style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-primary)' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={winnerPlayerIds.has(p.id)}
                                  onChange={() => toggleWinner(p.id)}
                                />
                                <span>{p.display_name}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: 8, fontSize: 13 }}>
                          <span className="selectedWinnersLabel">Selected:</span>{' '}
                          <span className="selectedWinnersNames">{selectedWinnersLabel}</span>
                        </div>

                        {winnerPlayerIds.size > 0 && (
                          <button onClick={clearWinners} className="clearWinnersButton">
                            Clear winners
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                        <button
                          onClick={openMarkPlayedModal}
                          className="markPlayedButton"
                          style={{ cursor: 'pointer' }}
                        >
                          Mark as Played 🎉
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {welcomeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(31, 42, 26, 0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              borderRadius: 16,
              width: 'min(720px, 94vw)',
              padding: 24,
              boxShadow: '0 18px 50px rgba(63, 90, 42, 0.2)',
              textAlign: 'center',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeWelcomeModal}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 8 }}>
              Welcome, weary traveler. You have found yourself embarking on a quest for the hallowed cabbage — an
              ancient relic of great power and deeply unclear purpose. Many have sought it, few have returned
              unchanged, and none can quite explain the rules. Along this journey you will face trials of wit, luck,
              and wildly confident bad decisions. Proceed boldly, trust the cabbage, and know this: the quest is
              serious, but the outcome absolutely is not.
            </p>
          </div>
        </div>
      )}
      {noteModalOpen && game && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 14, 9, 0.6)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            className="markPlayedModal"
          >
            <div className="markPlayedModalInner">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div className="markPlayedModalTitle">Add a note</div>
                  <div className="markPlayedModalSubtitle">{game.name}</div>
                </div>
                <button
                  onClick={() => setNoteModalOpen(false)}
                  className="markPlayedModalClose"
                  disabled={marking}
                >
                  Close
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <textarea
                  className="noteTextarea"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Optional note (e.g., ‘Tom dominated round 2’)…"
                  rows={5}
                  disabled={marking}
                />
                <div className="markPlayedModalHint">This note will appear in History under “Notes”.</div>
              </div>

              <div className="markPlayedModalField">
                <label className="markPlayedModalLabel" htmlFor="win-image-input">
                  Attach a win image (optional)
                </label>
                <input
                  id="win-image-input"
                  ref={winImageInputRef}
                  className="markPlayedModalFileInput"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleWinImageChange}
                  disabled={marking}
                />
                <div className="markPlayedModalHint">
                  Upload one or more PNG, JPG, or WebP images up to 5MB each to celebrate the win.
                </div>
                {winImageFiles.length > 0 && (
                  <div className="markPlayedModalFileList">
                    {winImageFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="markPlayedModalFileMeta">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeWinImage(index)}
                          className="markPlayedModalFileRemove"
                          disabled={marking}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={resetWinImage}
                      className="markPlayedModalFileClear"
                      disabled={marking}
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button
                  onClick={confirmMarkPlayed}
                  className="markPlayedModalPrimary"
                  disabled={marking}
                >
                  {marking ? 'Saving…' : 'Save & mark played'}
                </button>

                <button
                  onClick={() => setNoteModalOpen(false)}
                  className="markPlayedModalSecondary"
                  disabled={marking}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .explosionOverlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          z-index: 80;
        }

        .explosionCore {
          position: absolute;
          width: 48vmin;
          height: 48vmin;
          max-width: 480px;
          max-height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffeab7 0%, #ff9447 40%, rgba(255, 115, 69, 0) 70%);
          filter: blur(2px);
          animation: explosion-core 900ms ease-out forwards;
        }

        .explosionRing {
          position: absolute;
          width: 60vmin;
          height: 60vmin;
          max-width: 560px;
          max-height: 560px;
          border-radius: 50%;
          border: 4px solid rgba(255, 208, 97, 0.8);
          box-shadow: 0 0 40px rgba(255, 163, 73, 0.7);
          animation: explosion-ring 900ms ease-out forwards;
        }

        .explosionSpark {
          position: absolute;
          width: 10vmin;
          height: 2vmin;
          max-width: 90px;
          max-height: 18px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 244, 204, 0.95), rgba(255, 138, 72, 0.1));
          transform-origin: left center;
          transform: rotate(var(--spark-rotate)) translateX(8vmin) scaleX(0.2);
          animation: explosion-spark 900ms ease-out forwards;
          animation-delay: var(--spark-delay);
        }

        @keyframes explosion-core {
          0% {
            transform: scale(0.2);
            opacity: 0.2;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes explosion-ring {
          0% {
            transform: scale(0.1);
            opacity: 0.4;
          }
          70% {
            transform: scale(1);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes explosion-spark {
          0% {
            transform: rotate(var(--spark-rotate)) translateX(6vmin) scaleX(0.1);
            opacity: 0.1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: rotate(var(--spark-rotate)) translateX(26vmin) scaleX(1);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  )
}
