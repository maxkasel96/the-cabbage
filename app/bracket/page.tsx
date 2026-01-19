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
    <main style={{ padding: '20px clamp(16px, 4vw, 40px) 60px' }}>
      <Nav />
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Bracket Generator</h1>
          <p style={{ margin: 0, color: '#415345' }}>
            Shuffle active players into a single-elimination bracket with automatic byes.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Active players: {isLoadingPlayers ? '…' : playerCount}</span>
            {playerCount < 2 && !isLoadingPlayers ? (
              <span style={{ color: '#9a3412', fontWeight: 600 }}>
                Need at least 2 active players to generate a bracket.
              </span>
            ) : null}
          </div>
        </header>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            style={{
              padding: '12px 20px',
              borderRadius: 999,
              border: '1px solid #29593d',
              backgroundColor: isGenerateDisabled ? '#c8d2c1' : '#2f6d4a',
              color: isGenerateDisabled ? '#526155' : '#fdfcf8',
              fontWeight: 700,
              fontSize: 15,
              cursor: isGenerateDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isGenerateDisabled ? 'none' : '0 12px 20px rgba(47, 109, 74, 0.25)',
            }}
          >
            {bracket ? 'Regenerate Bracket' : 'Generate Bracket'}
          </button>
          <span style={{ color: '#526155' }}>
            {bracket ? `Generated ${new Date(bracket.generatedAt).toLocaleString()}` : 'No bracket yet.'}
          </span>
        </div>

        {status ? (
          <div
            role="status"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #f5c7b2',
              backgroundColor: '#fff3ed',
              color: '#9a3412',
              fontWeight: 600,
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
                  border: '1px solid #d4e3d2',
                  backgroundColor: '#f6f7f1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Round {round.roundNumber}</h2>
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
                          border: '1px solid #d5dbc8',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#55624f', fontWeight: 600 }}>
                          Match {index + 1}
                        </span>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              backgroundColor: slotAName ? '#e9f1e5' : '#f8f8f2',
                              border: '1px dashed #c6d2bf',
                              fontWeight: 600,
                            }}
                          >
                            {slotAName ?? 'Bye'}
                          </div>
                          <div style={{ textAlign: 'center', color: '#7b8576', fontSize: 12 }}>vs</div>
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              backgroundColor: slotBName ? '#e9f1e5' : '#f8f8f2',
                              border: '1px dashed #c6d2bf',
                              fontWeight: 600,
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
              border: '1px dashed #d0d8cc',
              backgroundColor: '#fbfbf6',
              color: '#6b7468',
            }}
          >
            Generate a bracket to see the round-by-round layout.
          </div>
        )}
      </section>
    </main>
  )
}
