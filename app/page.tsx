'use client'

import { useEffect, useRef, useState } from 'react'
import Nav from './components/Nav'

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

export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [status, setStatus] = useState<string>('')

  // note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [marking, setMarking] = useState(false)

  // Multi-select tag filters (by slug)
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<Set<string>>(new Set())

  const [playerCount, setPlayerCount] = useState('')

  // Multi-select winners (by player id)
  const [winnerPlayerIds, setWinnerPlayerIds] = useState<Set<string>>(new Set())

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
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>

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

        .rollBtn {
          transition: transform 120ms ease, opacity 120ms ease;
          background: #388e4a;
          color: #fff;
          border: none;
          border-radius: 16px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 16px rgba(56, 142, 74, 0.28);
        }
        .rollBtn:active {
          transform: scale(0.98);
        }
        .rollBtnRolling {
          animation: shake 420ms ease-in-out;
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
          color: #6b6e6a;
        }
        
        .noteTextarea {
          color: #000;
        }

      `}</style>


      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Board Game Picker</h1>
      <Nav />

      {/* Tag filter chips */}
      {tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Filter by vibe:</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map((t) => {
              const active = selectedTagSlugs.has(t.slug)
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.slug)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : '#388e4a',
                    color: active ? '#388e4a' : '#fff',
                    fontSize: 13,
                  }}
                  title={t.slug}
                >
                  {active ? '✓ ' : ''}
                  {t.label}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              <strong>Filters:</strong> {selectedLabels}
            </div>

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
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Number of players:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="number"
            min={1}
            value={playerCount}
            onChange={(event) => setPlayerCount(event.target.value)}
            placeholder="e.g., 4"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ccc',
              fontSize: 13,
              width: 120,
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Leave blank to ignore player count.
          </div>
        </div>
      </div>

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
        }}
      >
        {isRolling ? 'Choosing from the cabbage… 🥬' : game ? 'Pick another game from the cabbage 🥬' : 'Pick a game from the cabbage 🥬'}
      </button>

      {/* Status */}
      {status && (
        <p style={{ marginBottom: 16 }}>
          <strong>{status}</strong> <a href="/history">Open History</a>
        </p>
      )}

      {!game ? (
        <p>Let the cabbage take the guessing out of things. Select Pick a game from the cabbage to get rolling.</p>
      ) : (
        <div key={rollKey} className={isRolling ? 'gameCardRolling' : 'gameCardPop'} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 720 }}
>          <h2 style={{ fontSize: 22, marginTop: 0 }}>{game.name}</h2>

          <p style={{ margin: '8px 0' }}>
            Players:{' '}
            {game.min_players && game.max_players ? `${game.min_players}–${game.max_players}` : '—'}
          </p>

          <p style={{ margin: '8px 0' }}>
            Playtime: {game.playtime_minutes ? `${game.playtime_minutes} min` : '—'}
          </p>

          {game.notes && <p style={{ margin: '8px 0' }}>{game.notes}</p>}

          {/* Multi-winner picker */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Select winner(s):</div>

            <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
              {players.map((p) => (
                <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={winnerPlayerIds.has(p.id)}
                    onChange={() => toggleWinner(p.id)}
                  />
                  <span>{p.display_name}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
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
                }}
              >
                Clear winners
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={openMarkPlayedModal} style={{ padding: '10px 14px', cursor: 'pointer' }}>
            Mark as played
            </button>
          </div>
        </div>
      )}
      {noteModalOpen && game && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'grid',
      placeItems: 'center',
      padding: 16,
      zIndex: 50,
    }}
  >
    <div style={{ background: '#388e4a', borderRadius: 12, width: 'min(720px, 95vw)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Add a note</div>
          <div style={{ opacity: 0.8 }}>{game.name}</div>
        </div>
        <button
          onClick={() => setNoteModalOpen(false)}
          style={{ padding: '8px 12px', cursor: 'pointer' }}
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
              border: '1px solid #ddd',
              background: '#ffffff'
            }}
            disabled={marking}
        />
        <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
          This note will appear in History under “Notes”.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <button
          onClick={confirmMarkPlayed}
          style={{ padding: '10px 14px', cursor: marking ? 'not-allowed' : 'pointer' }}
          disabled={marking}
        >
          {marking ? 'Saving…' : 'Save & mark played'}
        </button>

        <button
          onClick={() => setNoteModalOpen(false)}
          style={{ padding: '10px 14px', cursor: marking ? 'not-allowed' : 'pointer' }}
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
