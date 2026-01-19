'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'

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
  const slots: MatchSlot[] = Array.from({ length: totalSlots }, (_, index) => {
    const player = shuffled[index]
    return player ? { playerId: player.id, displayName: player.display_name } : { playerId: null, displayName: null }
  })

  const roundOneMatches: Match[] = []
  for (let i = 0; i < slots.length; i += 2) {
    roundOneMatches.push({
      id: crypto.randomUUID(),
      slotA: slots[i],
      slotB: slots[i + 1],
    })
  }

  const rounds: Round[] = [{ roundNumber: 1, matches: roundOneMatches }]

  for (let round = 2; round <= roundCount; round += 1) {
    const matchesInRound = totalSlots / Math.pow(2, round)
    const matches: Match[] = Array.from({ length: matchesInRound }, () => ({
      id: crypto.randomUUID(),
      slotA: { playerId: null, displayName: null },
      slotB: { playerId: null, displayName: null },
    }))
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
        backgroundColor: '#061a12',
        color: '#f4f7fb',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: 0.6 }}>Bracket Generator</h1>
      <Nav />
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
          <p style={{ margin: 0, color: '#cfe8d6' }}>
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
              background: '#0f2a1f',
              border: '1px solid rgba(74, 222, 128, 0.2)',
            }}
          >
            <span style={{ fontWeight: 700, color: '#e6edf8' }}>
              Active players: {isLoadingPlayers ? '…' : playerCount}
            </span>
            {playerCount < 2 && !isLoadingPlayers ? (
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
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
            background: '#0f2a1f',
            border: '1px solid rgba(74, 222, 128, 0.2)',
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
              background: isGenerateDisabled ? 'rgba(148, 163, 184, 0.35)' : '#4ade80',
              color: isGenerateDisabled ? '#94a3b8' : '#062314',
              fontWeight: 700,
              fontSize: 15,
              cursor: isGenerateDisabled ? 'not-allowed' : 'pointer',
              letterSpacing: 0.4,
            }}
          >
            {bracket ? 'Regenerate Bracket' : 'Generate Bracket'}
          </button>
          <span style={{ color: '#cfe8d6', opacity: 0.8 }}>
            {bracket ? `Generated ${new Date(bracket.generatedAt).toLocaleString()}` : 'No bracket yet.'}
          </span>
        </div>

        {status ? (
          <div
            role="status"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(251, 191, 36, 0.35)',
              backgroundColor: '#1f2c1d',
              color: '#fbbf24',
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
                  border: '2px solid #14532d',
                  background: '#0a2016',
                  boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: '#e7f8ed', letterSpacing: 0.6 }}>
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
                          border: '1px solid rgba(74, 222, 128, 0.2)',
                          background:
                            index % 2 === 0
                              ? 'linear-gradient(90deg, rgba(6,26,18,0.95), rgba(8,32,22,0.85))'
                              : 'linear-gradient(90deg, rgba(8,32,22,0.95), rgba(10,40,26,0.85))',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#cfe8d6', fontWeight: 700, letterSpacing: 0.6 }}>
                          Match {index + 1}
                        </span>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              backgroundColor: slotAName ? '#0f2a1f' : '#0b1f16',
                              border: '1px dashed rgba(74, 222, 128, 0.35)',
                              fontWeight: 700,
                              color: slotAName ? '#f4f7fb' : '#94a3b8',
                            }}
                          >
                            {slotAName ?? 'Bye'}
                          </div>
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>vs</div>
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              backgroundColor: slotBName ? '#0f2a1f' : '#0b1f16',
                              border: '1px dashed rgba(74, 222, 128, 0.35)',
                              fontWeight: 700,
                              color: slotBName ? '#f4f7fb' : '#94a3b8',
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
              border: '1px dashed rgba(74, 222, 128, 0.35)',
              backgroundColor: '#0b1f16',
              color: '#cfe8d6',
            }}
          >
            Generate a bracket to see the round-by-round layout.
          </div>
        )}
      </section>
    </main>
  )
}
