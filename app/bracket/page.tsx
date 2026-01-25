'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

type Player = {
  id: string
  display_name: string
}

type MatchSlot = {
  playerId: string | null
  displayName: string | null
}

type Match = {
  id: string
  slotA: MatchSlot
  slotB: MatchSlot
}

type Round = {
  roundNumber: number
  matches: Match[]
}

type Bracket = {
  generatedAt: string
  rounds: Round[]
}

function shufflePlayers(players: Player[]) {
  const shuffled = [...players]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function nextPowerOfTwo(value: number) {
  let next = 1
  while (next < value) {
    next *= 2
  }
  return next
}

function buildBracket(players: Player[]): Bracket {
  const shuffled = shufflePlayers(players)
  const totalSlots = nextPowerOfTwo(shuffled.length)
  const roundCount = Math.log2(totalSlots)
  const matchCount = totalSlots / 2
  const emptySlot = { playerId: null, displayName: null }

  const roundOneMatches: Match[] = Array.from({ length: matchCount }, () => ({
    id: crypto.randomUUID(),
    slotA: emptySlot,
    slotB: emptySlot,
  }))

  let playerIndex = 0
  for (let i = 0; i < roundOneMatches.length; i += 1) {
    const player = shuffled[playerIndex]
    if (!player) break
    roundOneMatches[i].slotA = { playerId: player.id, displayName: player.display_name }
    playerIndex += 1
  }

  for (let i = 0; i < roundOneMatches.length; i += 1) {
    const player = shuffled[playerIndex]
    if (!player) break
    roundOneMatches[i].slotB = { playerId: player.id, displayName: player.display_name }
    playerIndex += 1
  }

  const rounds: Round[] = [{ roundNumber: 1, matches: roundOneMatches }]

  const advanceIfBye = (match: Match) => {
    const hasSlotA = Boolean(match.slotA.playerId)
    const hasSlotB = Boolean(match.slotB.playerId)
    if (hasSlotA && !hasSlotB) return match.slotA
    if (!hasSlotA && hasSlotB) return match.slotB
    return null
  }

  for (let round = 2; round <= roundCount; round += 1) {
    const previousRound = rounds[rounds.length - 1]
    const matches: Match[] = []

    for (let i = 0; i < previousRound.matches.length; i += 2) {
      const previousMatchA = previousRound.matches[i]
      const previousMatchB = previousRound.matches[i + 1]
      const advancingA = round === 2 ? advanceIfBye(previousMatchA) : null
      const advancingB = round === 2 ? advanceIfBye(previousMatchB) : null
      const placeholderA: MatchSlot = {
        playerId: null,
        displayName: `Winner of Round ${round - 1} Match ${i + 1}`,
      }
      const placeholderB: MatchSlot = {
        playerId: null,
        displayName: `Winner of Round ${round - 1} Match ${i + 2}`,
      }

      matches.push({
        id: crypto.randomUUID(),
        slotA: advancingA ?? placeholderA,
        slotB: advancingB ?? placeholderB,
      })
    }

    rounds.push({ roundNumber: round, matches })
  }

  return {
    generatedAt: new Date().toISOString(),
    rounds,
  }
}

export default function BracketPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [bracket, setBracket] = useState<Bracket | null>(null)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState('')

  const playerCount = players.length

  async function loadPlayers() {
    setIsLoadingPlayers(true)
    const res = await fetch('/api/players')
    const json = await res.json()
    if (!res.ok) {
      setStatus(json.error || 'Failed to load players.')
      setPlayers([])
      setIsLoadingPlayers(false)
      return []
    }
    const nextPlayers = (json.players ?? []) as Player[]
    setPlayers(nextPlayers)
    setIsLoadingPlayers(false)
    return nextPlayers
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlayers()
  }, [])

  const playerLookup = useMemo(() => {
    return new Map(players.map((player) => [player.id, player.display_name]))
  }, [players])

  async function handleGenerate() {
    if (isGenerating) return
    setStatus('')
    setIsGenerating(true)
    const latestPlayers = await loadPlayers()
    if (latestPlayers.length < 2) {
      setBracket(null)
      setStatus('Need at least 2 active players to generate a bracket.')
      setIsGenerating(false)
      return
    }
    const nextBracket = buildBracket(latestPlayers)
    setBracket(nextBracket)
    setIsGenerating(false)
  }

  const isGenerateDisabled = isGenerating || isLoadingPlayers || playerCount < 2

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
      <div className="pageShell px-6 pb-12 pt-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Bracket Generator</PageTitle>
        <section
          style={{
            maxWidth: 1100,
            margin: '12px auto 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Shuffle active players into a single-elimination bracket with automatic byes.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              padding: 12,
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Active players: {isLoadingPlayers ? '…' : playerCount}
            </span>
            {playerCount < 2 && !isLoadingPlayers ? (
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Need at least 2 active players to generate a bracket.
              </span>
            ) : null}
          </div>
        </header>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          alignItems: 'center',
          padding: 12,
          borderRadius: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
        }}
      >
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: 'none',
              background: isGenerateDisabled ? 'rgba(47, 74, 30, 0.2)' : 'var(--primary)',
              color: isGenerateDisabled ? 'rgba(30, 43, 24, 0.6)' : 'var(--text-inverse)',
              fontWeight: 700,
              fontSize: 15,
              cursor: isGenerateDisabled ? 'not-allowed' : 'pointer',
              letterSpacing: 0.4,
            }}
          >
            {bracket ? 'Regenerate Bracket' : 'Generate Bracket'}
          </button>
          <span style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
            {bracket ? `Generated ${new Date(bracket.generatedAt).toLocaleString()}` : 'No bracket yet.'}
          </span>
        </div>

        {status ? (
          <div
            role="status"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(111, 143, 74, 0.45)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}
          >
            {status}
          </div>
        ) : null}

        {bracket ? (
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {bracket.rounds.map((round) => (
              <section
                key={round.roundNumber}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: '2px solid var(--border-strong)',
                  background: 'var(--surface)',
                  boxShadow: '0 18px 40px rgba(63, 90, 42, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)', letterSpacing: 0.6 }}>
                  Round {round.roundNumber}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {round.matches.map((match, index) => {
                    const slotAName =
                      match.slotA.displayName ?? (match.slotA.playerId ? playerLookup.get(match.slotA.playerId) : null)
                    const slotBName =
                      match.slotB.displayName ?? (match.slotB.playerId ? playerLookup.get(match.slotB.playerId) : null)
                    return (
                      <div
                        key={match.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid var(--divider-soft)',
                          background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: 0.6 }}
                        >
                          Match {index + 1}
                        </span>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              backgroundColor: slotAName ? 'var(--page-background)' : 'rgba(241, 246, 237, 0.7)',
                              border: '1px dashed var(--divider-soft)',
                              fontWeight: 700,
                              color: slotAName ? 'var(--text-primary)' : 'rgba(30, 43, 24, 0.6)',
                            }}
                          >
                            {slotAName ?? 'Bye'}
                          </div>
                          <div style={{ textAlign: 'center', color: 'rgba(63, 90, 42, 0.6)', fontSize: 12 }}>
                            vs
                          </div>
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              backgroundColor: slotBName ? 'var(--page-background)' : 'rgba(241, 246, 237, 0.7)',
                              border: '1px dashed var(--divider-soft)',
                              fontWeight: 700,
                              color: slotBName ? 'var(--text-primary)' : 'rgba(30, 43, 24, 0.6)',
                            }}
                          >
                            {slotBName ?? 'Bye'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: '1px dashed var(--divider-soft)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-secondary)',
            }}
          >
            Generate a bracket to see the round-by-round layout.
          </div>
        )}
        </section>
      </div>
    </main>
  )
}
