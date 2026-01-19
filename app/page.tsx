'use client'

import { useEffect, useRef, useState } from 'react'
import Nav from './components/Nav'
import PageTitle from './components/PageTitle'

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


  async function markPlayed() {
    if (!game) return
    setStatus('')
    setNoteDraft('')
    setNoteModalOpen(true)

    const winnerIds = Array.from(winnerPlayerIds)

    const res = await fetch('/api/game/mark-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: game.id,
        winnerPlayerIds: winnerIds,
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

    // Auto-roll again with current filters
    await rollRandom()
  }

function openMarkPlayedModal() {
  if (!game) return
  setStatus('')
  setNoteDraft('')
  setNoteModalOpen(true)
}

  function closeWelcomeModal() {
    window.localStorage.setItem('cabbageWelcomeSeen', 'true')
    setWelcomeModalOpen(false)
  }


// Function for saving note and closing modal
  async function confirmMarkPlayed() {
    if (!game) return
    if (marking) return

    setMarking(true)
    setStatus('')

    const winnerIds = Array.from(winnerPlayerIds)
    const note = noteDraft.trim()

    const res = await fetch('/api/game/mark-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: game.id,
        winnerPlayerIds: winnerIds,
        note: note.length ? note : null,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setStatus(json.error || 'Failed to mark as played')
      setMarking(false)
      return
    }

    setNoteModalOpen(false)
    setMarking(false)

    setStatus(`Saved: ${game.name}. View History to confirm.`)

    await rollRandom()
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

      {/* rolling an animation */}
      <style>{`
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

        .rollBtn {
          transition: transform 120ms ease, opacity 120ms ease;
          background: var(--primary);
          color: var(--text-inverse);
          border: none;
          border-radius: 16px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 20px rgba(63, 90, 42, 0.2);
        }
        .rollBtn:active {
          transform: scale(0.98);
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
          color: rgba(63, 90, 42, 0.6);
        }
        
        .noteTextarea {
          color: var(--text-primary);
        }

        .filtersCard {
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 16px 34px rgba(63, 90, 42, 0.2);
          max-width: 840px;
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
          color: var(--text-primary);
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
          max-width: 760px;
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
          background: var(--secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-strong);
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 18px rgba(63, 90, 42, 0.18);
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
          gap: 10px;
          margin-top: 10px;
        }

        .teamCard {
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          padding: 10px 12px;
          background: var(--surface);
        }

      `}</style>


      <PageTitle>The Game Cabbage</PageTitle>
      <Nav />

      <section style={{ marginBottom: 20 }}>
        <div className="filtersCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Choose your vibe</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Mix and match tags to steer the cabbage toward your perfect quest.
              </div>
            </div>
            <div className="filtersSummary">
              <strong>Filters:</strong> {selectedLabels}
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
        </div>
      </section>

      {/* Primary actions */}
      <button
        onClick={rollRandom}
        ref={rollButtonRef}
        disabled={isRolling}
        className={`rollBtn ${isRolling ? 'rollBtnRolling' : ''}`}
        style={{
          padding: '16px 26px',
          cursor: isRolling ? 'not-allowed' : 'pointer',
          opacity: isRolling ? 0.75 : 1,
          fontSize: 20,
          marginBottom: game ? 24 : 16,
        }}
      >
        {isRolling ? 'Choosing from the cabbage… 🥬' : game ? 'Pick another game from the cabbage 🥬' : 'Pick a game from the cabbage 🥬'}
      </button>

      {/* Status */}
      {status && (
        <p style={{ marginBottom: 16 }}>
          <strong>{status}</strong>{' '}
          <a href="/history" style={{ color: 'var(--primary)' }}>
            Open History
          </a>
        </p>
      )}

      {!game ? (
        <p style={{ color: 'var(--text-secondary)' }}>
          Let the cabbage take the guessing out of things. Select Pick a game from the cabbage to get rolling.
        </p>
      ) : (
        <div key={rollKey} className={isRolling ? 'gameCardRolling' : 'gameCardPop'}>
          <div className="resultCard">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div className="resultBadge">✨ Fresh from the cabbage</div>
              <div style={{ fontSize: 12, opacity: 0.7, color: 'var(--text-secondary)' }}>Ready when you are</div>
            </div>
            <h2 style={{ fontSize: 24, marginTop: 12, marginBottom: 6 }}>{game.name}</h2>

            <div className="statRow">
              <div className="statPill">
                👥 Players: {game.min_players && game.max_players ? `${game.min_players}–${game.max_players}` : '—'}
              </div>
              <div className="statPill">⏱️ Playtime: {game.playtime_minutes ? `${game.playtime_minutes} min` : '—'}</div>
            </div>

            {game.notes && (
              <p style={{ margin: '8px 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>{game.notes}</p>
            )}

            {!gameStarted && (
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <button onClick={startGame} className="startGameButton" style={{ cursor: 'pointer' }}>
                  Start a game
                </button>
              </div>
            )}

            {gameStarted && (
              <div className="teamPanel">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Team setup</div>
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
                        style={{ cursor: 'pointer' }}
                      >
                        Generate teams
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
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Team {team.id}</div>
                        {team.players.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No players assigned.</div>
                        ) : (
                          <div style={{ display: 'grid', gap: 4 }}>
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
                {/* Multi-winner picker */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Select winner(s):</div>

                  {teamMode === 'teams' && teams.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        Choose a winning team
                      </div>
                      <div style={{ display: 'grid', gap: 6, maxWidth: 320 }}>
                        {teams.map((team) => (
                          <label
                            key={team.id}
                            style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-primary)' }}
                          >
                            <input
                              type="radio"
                              name="winning-team"
                              checked={winningTeamId === team.id}
                              onChange={() => selectWinningTeam(team.id)}
                            />
                            <span>Team {team.id}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

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

                  <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Selected:</strong> {selectedWinnersLabel}
                  </div>

                  {winnerPlayerIds.size > 0 && (
                    <button
                      onClick={clearWinners}
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        background: 'none',
                        border: 'none',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'var(--text-muted)',
                      }}
                    >
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
                    Mark as played
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
            background: 'rgba(31, 42, 26, 0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              width: 'min(720px, 95vw)',
              padding: 16,
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Add a note</div>
                <div style={{ opacity: 0.8, color: 'var(--text-secondary)' }}>{game.name}</div>
              </div>
              <button
                onClick={() => setNoteModalOpen(false)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: 999,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--page-background)',
                  color: 'var(--text-primary)',
                }}
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
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--page-background)',
                }}
                disabled={marking}
              />
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12, color: 'var(--text-muted)' }}>
                This note will appear in History under “Notes”.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <button
                onClick={confirmMarkPlayed}
                style={{
                  padding: '10px 14px',
                  cursor: marking ? 'not-allowed' : 'pointer',
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--text-inverse)',
                  fontWeight: 700,
                }}
                disabled={marking}
              >
                {marking ? 'Saving…' : 'Save & mark played'}
              </button>

              <button
                onClick={() => setNoteModalOpen(false)}
                style={{
                  padding: '10px 14px',
                  cursor: marking ? 'not-allowed' : 'pointer',
                  borderRadius: 999,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--page-background)',
                  color: 'var(--text-primary)',
                }}
                disabled={marking}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
