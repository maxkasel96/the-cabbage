'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import Nav from './components/Nav'
import PageTitle from './components/PageTitle'
import useBodyScrollLock from '@/app/hooks/useBodyScrollLock'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

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

type Team = {
  id: number
  players: Player[]
}

type Tournament = {
  id: string
  is_active: boolean | null
}

type ApiState = {
  loading: boolean
  error: string | null
  result: unknown | null
}

type RecommendedGame = {
  gameId: string
  name: string
  fitScore: number
  reason: string
  warning: string
}

const RECOMMENDATION_LOADING_IMAGE_URL =
  'https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/il_1588xN.7325241583_mwao%20copy.png'


export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])

  const [status, setStatus] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [marking, setMarking] = useState(false)
  const [winImageFiles, setWinImageFiles] = useState<File[]>([])
  const winImageInputRef = useRef<HTMLInputElement | null>(null)

  const [playerCount, setPlayerCount] = useState('')
  const [poolVersion, setPoolVersion] = useState(0)
  const [pool, setPool] = useState<{ key: string; count: number } | null>(null)
  const poolKey = `${poolVersion}/${playerCount}`
  const eligibleCount = pool?.key === poolKey ? pool.count : null
  const validGroupSize = !playerCount || (Number.isInteger(Number(playerCount)) && Number(playerCount) > 0 && Number(playerCount) <= 2147483647)
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [recommendationPrompt, setRecommendationPrompt] = useState('')
  const [recommendState, setRecommendState] = useState<ApiState>({
    loading: false,
    error: null,
    result: null,
  })
  const [recommendedGames, setRecommendedGames] = useState<RecommendedGame[]>([])
  const [activeRecommendedGameId, setActiveRecommendedGameId] = useState<string | null>(null)

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

  useBodyScrollLock(noteModalOpen)

  async function fetchPlayers() {
    const res = await fetch('/api/players')
    const json = await res.json()
    setPlayers(json.players ?? [])
  }

  async function fetchActiveTournament() {
    const res = await fetch('/api/tournaments')
    const json = await res.json()

    if (!res.ok) {
      setRecommendState({
        loading: false,
        error: typeof json?.error === 'string' ? json.error : 'Failed to fetch tournaments',
        result: null,
      })
      return
    }

    const tournaments = Array.isArray(json?.tournaments) ? (json.tournaments as Tournament[]) : []
    const activeTournament = tournaments.find((tournament) => tournament.is_active) ?? tournaments[0] ?? null
    setActiveTournamentId(activeTournament?.id ?? '')
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers()
    fetchActiveTournament()
  }, [])

  useEffect(() => {
    const supabase = supabaseBrowser()

    let revision = 0
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = ++revision
      if (!session) {
        setIsAuthenticated(false)
        setIsAdmin(false)
        return
      }
      void fetch('/api/account/access', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(async response => response.ok ? response.json() : null)
        .catch(() => null)
        .then(access => {
          if (current !== revision) return
          setIsAuthenticated(Boolean(access?.player) || access?.role === 'admin')
          setIsAdmin(access?.role === 'admin')
        })
    })

    return () => {
      revision++
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!validGroupSize) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ countOnly: '1' })
      if (playerCount) params.set('playerCount', playerCount)
      try {
        const response = await fetch(`/api/random?${params}`, { signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        if (!controller.signal.aborted && typeof data.eligibleCount === 'number') {
          setPool({ key: poolKey, count: data.eligibleCount })
        }
      } catch {
        // A count is optional. The draw checks the current pool independently.
      }
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [playerCount, poolKey, validGroupSize])

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
    setActiveRecommendedGameId(null)
    resetWinImage()
  }

  // Random roll animation helper
  const [isRolling, setIsRolling] = useState(false)
  const [rollKey, setRollKey] = useState(0)
  async function rollRandom() {
    if (isRolling) return
    if (!isAuthenticated) {
      setStatus('Sign in is required to harness the power of the cabbage.')
      return
    }

    const params = new URLSearchParams()
    if (game && !activeRecommendedGameId) params.set('previousId', game.id)
    if (playerCount) params.set('playerCount', playerCount)

    resetRecommendation()
    setStatus('')
    setRecommendedGames([])
    setRecommendState({ loading: false, error: null, result: null })
    setIsRolling(true)
    try {
      const response = await fetch(`/api/random?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Could not draw a game.')
      setGame(data.game)
      setRollKey((key) => key + 1)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not draw a game.')
    } finally {
      setIsRolling(false)
    }
  }

  function extractRecommendedGames(result: unknown) {
    if (!result || typeof result !== 'object') {
      return []
    }

    const recommendations = (result as { recommendations?: unknown }).recommendations
    if (!Array.isArray(recommendations)) {
      return []
    }

    return recommendations
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null
        }

        const recommendation = entry as {
          gameId?: unknown
          name?: unknown
          fitScore?: unknown
          reason?: unknown
          warning?: unknown
        }

        if (typeof recommendation.gameId !== 'string' || typeof recommendation.name !== 'string') {
          return null
        }

        const fitScore =
          typeof recommendation.fitScore === 'number' && Number.isFinite(recommendation.fitScore)
            ? recommendation.fitScore
            : 0

        return {
          gameId: recommendation.gameId,
          name: recommendation.name,
          fitScore,
          reason: typeof recommendation.reason === 'string' ? recommendation.reason : '',
          warning: typeof recommendation.warning === 'string' ? recommendation.warning : '',
        }
      })
      .filter((entry): entry is RecommendedGame => Boolean(entry))
  }

  function useRecommendedGame(recommendation: RecommendedGame) {
    setStatus('')
    setActiveRecommendedGameId(recommendation.gameId)
    setGame({
      id: recommendation.gameId,
      name: recommendation.name,
      min_players: null,
      max_players: null,
      playtime_minutes: null,
      notes: recommendation.reason || recommendation.warning || null,
    })
    setRollKey((key) => key + 1)
    setGameStarted(true)
    setTeamMode('')
    setTeamCount('')
    setTeams([])
    setTeamStatus('')
    setShowWinners(false)
    setWinningTeamId(null)
    setWinnerPlayerIds(new Set())
    resetWinImage()
  }

  async function runRecommendations() {
    if (!isAuthenticated) {
      setRecommendState({
        loading: false,
        error: 'Sign in is required to harness the power of the cabbage.',
        result: null,
      })
      return
    }

    if (!activeTournamentId) {
      setRecommendState({
        loading: false,
        error: 'No active tournament available for recommendations.',
        result: null,
      })
      return
    }

    const groupSize = playerCount.trim() ? Number(playerCount) : undefined
    if (groupSize !== undefined && (!Number.isSafeInteger(groupSize) || groupSize < 1)) {
      setRecommendState({ loading: false, error: 'Enter a positive whole number of players.', result: null })
      return
    }

    resetRecommendation()
    setStatus('')
    setRecommendState({ loading: true, error: null, result: null })
    setRecommendedGames([])
    setActiveRecommendedGameId(null)

    try {
      const response = await fetch('/api/ai/recommend-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: activeTournamentId,
          playerCount: groupSize,
          userPrompt: recommendationPrompt.trim(),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Recommendation request failed')
      }

      if (data.meta?.candidateCount === 0) {
        const count = data.meta.playerCount
        const message = count ? `No active games support a group of ${count}.` : 'There are no active games to recommend.'
        throw new Error(message)
      }

      setRecommendState({ loading: false, error: null, result: data })
      setRecommendedGames(extractRecommendedGames(data))
    } catch (error) {
      setRecommendState({
        loading: false,
        error: error instanceof Error ? error.message : 'Recommendation request failed',
        result: null,
      })
      setRecommendedGames([])
    }
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

    setPoolVersion((version) => version + 1)
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

    setPoolVersion((version) => version + 1)
    resetRecommendation()
  }

  const selectedWinnersLabel =
    winnerPlayerIds.size === 0
      ? 'None'
      : players
          .filter((p) => winnerPlayerIds.has(p.id))
          .map((p) => p.display_name)
          .join(', ')

  function renderGameCard(displayGame: Game, options?: { badge: string; meta?: string; key?: string }) {
    return (
      <div key={options?.key ?? displayGame.id} className={isRolling ? 'gameCardRolling' : 'gameCardPop'}>
        <div className="resultCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="resultBadge">{options?.badge ?? '✨ Fresh from the cabbage'}</div>
            <div style={{ fontSize: 12, opacity: 0.7, color: 'var(--text-secondary)' }}>
              {options?.meta ?? 'Ready when you are'}
            </div>
          </div>
          <h2 style={{ fontSize: 24, marginTop: 12, marginBottom: 6 }}>{displayGame.name}</h2>

          <div className="statRow">
            <div className="statPill">
              👥 Players: {displayGame.min_players && displayGame.max_players ? `${displayGame.min_players}–${displayGame.max_players}` : '—'}
            </div>
            <div className="statPill">
              ⏱️ Playtime: {displayGame.playtime_minutes ? `${displayGame.playtime_minutes} min` : '—'}
            </div>
          </div>

          {displayGame.notes && (
            <p style={{ margin: '8px 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              {displayGame.notes}
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

          {isAdmin && showWinners && (
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
                            <div className={`winnerTeamPlayers ${isActive ? 'winnerTeamPlayersActive' : ''}`}>
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
                  <button onClick={clearWinners} className="btn--secondary">
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
    )
  }

  return (
    <main
      className="pageFrame"
      style={{
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
          align-items: stretch;
          margin-top: 16px;
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
          background-image: url('https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/AdobeStock_15658970%201%20(2)%20(1).png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          color: #2e3f2a;
          padding: 24px;
          border-radius: 12px;
          width: min(720px, 90vw);
          aspect-ratio: 1 / 1;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
          text-align: center;
          overflow: hidden;
        }

        .markPlayedModal::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          z-index: 0;
        }

        .markPlayedModalInner {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          position: relative;
          z-index: 1;
          width: min(420px, 100%);
          margin: 0 auto;
          background: #ffffff;
          padding: 20px;
          border-radius: 12px;
          align-items: stretch;
          max-height: 100%;
          overflow-y: auto;
        }

        .markPlayedModal .modal-close {
          top: 12px;
          right: 12px;
        }

        .markPlayedModalHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .markPlayedModalBody {
          display: grid;
          gap: 8px;
        }

        .markPlayedModalActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .markPlayedModalInner {
            width: 100%;
            padding: 16px;
          }

          .markPlayedModalHeader {
            align-items: flex-start;
          }

          .markPlayedModalActions {
            justify-content: stretch;
          }

          .markPlayedModalActions button {
            flex: 1 1 100%;
          }
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
          min-width: 0;
        }

        .markPlayedModalLabel {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .markPlayedModalFileInput {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
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

        .markPlayedModalPrimary {
          padding: 10px 14px;
          cursor: pointer;
          border-radius: 999px;
          border: none;
          background: var(--primary);
          color: var(--text-inverse);
          font-weight: 700;
        }

        .pickerCard {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          background: color-mix(in srgb, var(--surface) 85%, #ffffff 15%);
          border: 2px solid color-mix(in srgb, var(--primary) 45%, var(--border-strong) 55%);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 16px 34px rgba(33, 54, 22, 0.28);
          color: var(--text-primary);
        }

        .pickerCard h2 { margin: 0; font-size: 22px; font-weight: 800; }
        .pickerCard p { margin: 0; color: var(--text-secondary); }
        .pickerCard button { margin-top: auto; padding: 12px 18px; font-size: 16px; cursor: pointer; }
        .pickerCard button:disabled { cursor: default; opacity: .65; }
        .pickerGroupSize { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
        .pickerGroupSize label { font-weight: 700; }
        .pickerResults { margin-top: 24px; }
        .playersInput {
          padding: 8px 12px;
          border-radius: 10px;
          border: 2px solid color-mix(in srgb, var(--primary) 35%, var(--border-strong) 65%);
          font-size: 14px;
          width: 140px;
          background: color-mix(in srgb, var(--page-background) 90%, #f0f6e6 10%);
          color: var(--text-primary);
          box-shadow: inset 0 1px 2px rgba(33, 54, 22, 0.22);
        }

        .playersInput::placeholder {
          color: rgba(63, 90, 42, 0.55);
        }

        .recommendationInput {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 14px 16px;
          min-height: 76px;
          border-radius: 12px;
          border: 2px solid color-mix(in srgb, var(--primary) 35%, var(--border-strong) 65%);
          background: color-mix(in srgb, var(--page-background) 92%, #f4f8ec 8%);
          color: var(--text-primary);
          font-size: 16px;
          line-height: 1.5;
          box-shadow: inset 0 1px 2px rgba(33, 54, 22, 0.16);
          resize: vertical;
          overflow-y: auto;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .recommendationInput::placeholder {
          color: color-mix(in srgb, var(--text-secondary) 82%, #6d7f5a 18%);
          font-style: italic;
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

        .recommendationLoadingOverlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(28, 37, 24, 0.48);
          backdrop-filter: blur(4px);
        }

        .recommendationLoadingPanel {
          display: grid;
          justify-items: center;
          gap: 14px;
          width: min(320px, 100%);
          padding: 28px 24px;
          border-radius: 24px;
          border: 1px solid rgba(243, 245, 236, 0.22);
          background: rgba(28, 37, 24, 0.72);
          box-shadow: 0 24px 60px rgba(15, 20, 13, 0.32);
          color: var(--text-inverse);
          text-align: center;
        }

        .recommendationLoadingSpinner {
          width: min(180px, 45vw);
          height: min(180px, 45vw);
          object-fit: contain;
          filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.28));
          animation: recommendation-loading-bounce 1.8s ease-in-out infinite;
        }

        .recommendationLoadingCaption {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(243, 245, 236, 0.92);
        }

        @keyframes recommendation-loading-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-18px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .recommendationLoadingSpinner {
            animation: none;
          }
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

      <div
        className="pageShell px-4 pb-12 pt-6 sm:px-6"
        inert={recommendState.loading}
        aria-hidden={recommendState.loading}
      >
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>The Game Cabbage</PageTitle>

        <div className="pickerGroupSize">
          <label htmlFor="player-count">Number of players <span className="sectionSubtitle">(optional)</span></label>
          <input id="player-count" className="playersInput" type="number" min="1" step="1"
            placeholder="Any size" value={playerCount} disabled={isRolling}
            aria-invalid={!validGroupSize} onChange={(event) => setPlayerCount(event.target.value)} />
          {!validGroupSize && <span role="alert">Enter a positive whole number.</span>}
        </div>

        <div className="mainLayout">
          <section className="pickerCard" aria-labelledby="random-heading">
            <h2 id="random-heading">Random pick</h2>
            <p aria-live="polite">
              {eligibleCount === null
                ? 'Draw from the unplayed games in this tournament.'
                : `${eligibleCount} unplayed ${eligibleCount === 1 ? 'game' : 'games'} available${playerCount ? ` for ${playerCount} ${Number(playerCount) === 1 ? 'player' : 'players'}` : ' in this tournament'}.`}
            </p>
            <button type="button" onClick={rollRandom} disabled={isRolling || !validGroupSize}
              className={`rollBtn ${isRolling ? 'rollBtnRolling' : ''}`}>
              {isRolling ? 'Choosing…' : game && !activeRecommendedGameId ? 'Pick again' : 'Pick a random game'}
            </button>
          </section>

          <section className="pickerCard" aria-labelledby="ai-heading">
            <h2 id="ai-heading"><label htmlFor="ai-prompt">Find a game with AI</label></h2>
            <textarea id="ai-prompt" className="recommendationInput" rows={2}
              value={recommendationPrompt} onChange={(event) => setRecommendationPrompt(event.target.value)}
              placeholder="Something funny we can play in half an hour, with no drawing." />
            <button type="button" className="startGameButton" onClick={runRecommendations}
              disabled={isRolling || recommendState.loading || !recommendationPrompt.trim() || !validGroupSize}>
              Search my games
            </button>
            {recommendState.error && <p role="alert">{recommendState.error}</p>}
            {recommendState.result && recommendedGames.length === 0 ? <p>No matches for this request.</p> : null}
          </section>
        </div>

        {(game || recommendedGames.length > 0 || status) && (
          <section className="sectionCard pickerResults" aria-label="Game results">
            {recommendedGames.length > 0 && (
              <div style={{ display: 'grid', gap: 12 }}>
                {recommendedGames.map((recommendation, index) => {
                  const isActiveRecommendation =
                    activeRecommendedGameId === recommendation.gameId && game?.id === recommendation.gameId

                  if (isActiveRecommendation && game) {
                    return renderGameCard(game, {
                      badge: `🤖 AI recommendation #${index + 1}`,
                      meta: `Fit score: ${recommendation.fitScore.toFixed(2)}`,
                      key: `${recommendation.gameId}-${index}`,
                    })
                  }

                  return (
                    <div key={`${recommendation.gameId}-${index}`} className="resultCard gameCardPop">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div className="resultBadge">🤖 AI recommendation #{index + 1}</div>
                        <div style={{ fontSize: 12, opacity: 0.7, color: 'var(--text-secondary)' }}>
                          Fit score: {recommendation.fitScore.toFixed(2)}
                        </div>
                      </div>
                      <h2 style={{ fontSize: 24, marginTop: 12, marginBottom: 6 }}>{recommendation.name}</h2>

                      {recommendation.reason ? (
                        <p style={{ margin: '8px 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          {recommendation.reason}
                        </p>
                      ) : null}

                      {recommendation.warning ? (
                        <p style={{ margin: '8px 0', color: '#7c4f00' }}>⚠️ {recommendation.warning}</p>
                      ) : null}

                      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => useRecommendedGame(recommendation)}
                          className="startGameButton"
                          style={{ cursor: 'pointer' }}
                        >
                          Play this game ▶
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {status && (
              <p role="status" style={{ marginBottom: 16 }}>
                <strong>{status}</strong>{' '}
                {status.startsWith('Saved:') && <a href="/history" style={{ color: 'var(--primary)' }}>
                  Open History
                </a>}
              </p>
            )}

            {game && !activeRecommendedGameId && renderGameCard(game, {
              badge: 'Random pick',
              key: String(rollKey),
            })}
          </section>
        )}
      </div>
      {recommendState.loading && (
        <div
          className="recommendationLoadingOverlay"
          role="alert"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="recommendationLoadingPanel">
            <img
              src={RECOMMENDATION_LOADING_IMAGE_URL}
              alt=""
              className="recommendationLoadingSpinner"
            />
            <p className="recommendationLoadingCaption">Generating recommendations...</p>
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
              <button
                type="button"
                className="modal-close"
                onClick={() => setNoteModalOpen(false)}
                aria-label="Close this nonsense"
                disabled={marking}
              >
                ✕
              </button>
              <div className="markPlayedModalHeader">
                <div>
                  <div className="markPlayedModalTitle">Add a note</div>
                  <div className="markPlayedModalSubtitle">{game.name}</div>
                </div>
              </div>

              <div className="markPlayedModalBody">
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
                <label
                  className="markPlayedModalLabel"
                  onClick={(event) => event.preventDefault()}
                >
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

              <div className="markPlayedModalActions">
                <button
                  onClick={confirmMarkPlayed}
                  className="markPlayedModalPrimary"
                  disabled={marking}
                >
                  {marking ? 'Saving…' : 'Save & mark played'}
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
