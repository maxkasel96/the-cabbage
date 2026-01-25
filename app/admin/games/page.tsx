'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '@/app/components/Nav'
import AdminSubNav from '@/app/components/AdminSubNav'
import PageTitle from '@/app/components/PageTitle'

type Tag = {
  id: string
  slug: string
  label: string
  sort_order: number
}

type Game = {
  id: string
  name: string
  is_active: boolean
  played_at: string | null
  min_players: number | null
  max_players: number | null
  tags: Tag[]
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')

  const [search, setSearch] = useState('')
  const [tagFilterId, setTagFilterId] = useState('')

  // Editor state
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, { min: string; max: string }>>({})
  const [playersSavingId, setPlayersSavingId] = useState<string | null>(null)
  const [playerSaveMessages, setPlayerSaveMessages] = useState<Record<string, string>>({})

  // Add new game state
  const [newGameName, setNewGameName] = useState('')
  const [newGameActive, setNewGameActive] = useState(true)
  const [creating, setCreating] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Bulk edit states
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set())
  const [bulkTagId, setBulkTagId] = useState<string>('') // tag to add
  const [bulkApplying, setBulkApplying] = useState(false)

  async function loadAll() {
    setLoading(true)
    setStatus('')

    const [gamesRes, tagsRes] = await Promise.all([fetch('/api/admin/games'), fetch('/api/tags')])

    const gamesJson = await gamesRes.json()
    const tagsJson = await tagsRes.json()

    if (!gamesRes.ok) {
      setStatus(gamesJson.error || 'Failed to load games')
      setLoading(false)
      return
    }
    if (!tagsRes.ok) {
      setStatus(tagsJson.error || 'Failed to load tags')
      setLoading(false)
      return
    }

    setGames(gamesJson.games ?? [])
    setTags(tagsJson.tags ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = !q ? games : games.filter((g) => g.name.toLowerCase().includes(q))
    const tagFiltered = tagFilterId ? base.filter((g) => g.tags?.some((t) => t.id === tagFilterId)) : base

    return [...tagFiltered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
  }, [games, search, tagFilterId])

  function openEditor(game: Game) {
    if (!game?.id) {
      setStatus('Cannot edit tags: this game is missing an id. Try Refresh.')
      return
    }

    setEditingGame(game)
    setEditingGameId(game.id)
    setSelectedTagIds(new Set((game.tags ?? []).map((t) => t.id).filter(Boolean)))
  }

  function getPlayerDraft(game: Game) {
    const draft = playerDrafts[game.id]
    if (draft) return draft
    return {
      min: game.min_players === null ? '' : String(game.min_players),
      max: game.max_players === null ? '' : String(game.max_players),
    }
  }

  function updatePlayerDraft(gameId: string, field: 'min' | 'max', value: string) {
    setPlayerDrafts((prev) => ({
      ...prev,
      [gameId]: {
        min: field === 'min' ? value : prev[gameId]?.min ?? '',
        max: field === 'max' ? value : prev[gameId]?.max ?? '',
      },
    }))
  }

  function parseNullableInt(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  async function savePlayerCounts(game: Game) {
    if (!game?.id) return
    if (playersSavingId) return

    const draft = getPlayerDraft(game)
    const minPlayers = parseNullableInt(draft.min)
    const maxPlayers = parseNullableInt(draft.max)

    if (minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers) {
      setStatus('Min players must be less than or equal to max players.')
      setPlayerSaveMessages((prev) => ({ ...prev, [game.id]: '' }))
      return
    }

    setPlayersSavingId(game.id)
    setStatus('')
    setPlayerSaveMessages((prev) => ({ ...prev, [game.id]: '' }))

    const res = await fetch(`/api/admin/games/${game.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ min_players: minPlayers, max_players: maxPlayers }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(json.error || 'Failed to save player counts')
      setPlayersSavingId(null)
      return
    }

    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id
          ? { ...g, min_players: json.game?.min_players ?? minPlayers, max_players: json.game?.max_players ?? maxPlayers }
          : g
      )
    )
    setPlayerSaveMessages((prev) => ({ ...prev, [game.id]: `Saved player counts for ${game.name}.` }))
    setPlayersSavingId(null)
  }

  function closeEditor() {
    setEditingGame(null)
    setEditingGameId(null)
    setSelectedTagIds(new Set())
  }

  function toggleTag(tagId: string) {
    if (!tagId) return

    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  async function saveTags() {
    console.log('saveTags editingGameId:', editingGameId, 'editingGame:', editingGame)

    if (!editingGameId) {
      setStatus('Missing game id. Please close and re-open the editor, then try again.')
      return
    }

    setSaving(true)
    setStatus('')

    const cleanTagIds = Array.from(selectedTagIds).filter(
      (id): id is string => typeof id === 'string' && id.length > 0 && id !== 'undefined'
    )

    const res = await fetch(`/api/admin/games/${editingGameId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: cleanTagIds }),
    })

    const json = await res.json()
    if (!res.ok) {
      setStatus(json.error || 'Failed to save tags')
      setSaving(false)
      return
    }

    // Optimistically update local state using what we actually saved
    const updatedTags = tags.filter((t) => cleanTagIds.includes(t.id))
    setGames((prev) => prev.map((g) => (g.id === editingGameId ? { ...g, tags: updatedTags } : g)))

    setSaving(false)
    closeEditor()
    setStatus('Saved.')
  }

  async function createGame() {
    const name = newGameName.trim()
    if (!name) {
      setStatus('Game name is required.')
      return
    }

    setCreating(true)
    setStatus('')

    const res = await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, is_active: newGameActive }),
    })

    const json = await res.json()

    if (!res.ok) {
      setStatus(json.error || 'Failed to create game')
      setCreating(false)
      return
    }

    // Add new game to UI immediately
    setGames((prev) => {
  const created: Game = { ...json.game, tags: json.game.tags ?? [] } // ensure tags exists
  if (prev.some((g) => g.id === created.id)) return prev

  return [...prev, created].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
  })

    // Reset form
    setNewGameName('')
    setNewGameActive(true)
    setCreating(false)
    setStatus(`Added game: ${json.game.name}`)
  }

  async function deleteGame(game: Game) {
    if (!game?.id) return

    const ok = window.confirm(`Delete "${game.name}"? This cannot be undone.`)
    if (!ok) return

    setDeletingId(game.id)
    setStatus('')

    const res = await fetch(`/api/admin/games/${game.id}`, { method: 'DELETE' })

    // safe parse (avoids crashing if response is empty/non-json)
    const text = await res.text()
    const json = text ? JSON.parse(text) : null

    if (!res.ok) {
      setStatus(json?.error || 'Failed to delete game')
      setDeletingId(null)
      return
    }

    setGames((prev) => prev.filter((g) => g.id !== game.id))
    setDeletingId(null)
    setStatus(`Deleted game: ${game.name}`)
    }

  // Bulk edit helpers
  function toggleGameSelected(gameId: string) {
      setSelectedGameIds((prev) => {
        const next = new Set(prev)
        if (next.has(gameId)) next.delete(gameId)
        else next.add(gameId)
        return next
      })
    }

  function clearBulkSelection() {
      setSelectedGameIds(new Set())
      setBulkTagId('')
    }

  function selectAllFiltered() {
      setSelectedGameIds(new Set(filteredGames.map((g) => g.id)))
    }

  async function applyBulkAddTag() {
  if (bulkApplying) return

  const gameIds = Array.from(selectedGameIds)
  if (gameIds.length === 0) {
    setStatus('Select at least one game.')
    return
  }
  if (!bulkTagId) {
    setStatus('Select a tag to add.')
    return
  }

  setBulkApplying(true)
  setStatus('')

  const res = await fetch('/api/admin/games/bulk-add-tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameIds, tagId: bulkTagId }),
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    setStatus(json.error || 'Failed to apply bulk tag')
    setBulkApplying(false)
    return
  }

  // Update local UI (merge the tag onto each selected game)
  const tagToAdd = tags.find((t) => t.id === bulkTagId)
  if (tagToAdd) {
    setGames((prev) =>
      prev.map((g) => {
        if (!selectedGameIds.has(g.id)) return g
        if (g.tags?.some((t) => t.id === tagToAdd.id)) return g
        return { ...g, tags: [...(g.tags ?? []), tagToAdd] }
      })
    )
  }

  setStatus(`Added tag to ${gameIds.length} game(s).`)
  setBulkApplying(false)
  clearBulkSelection()
}

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
      <div className="pageShell">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Admin: Games & Tags</PageTitle>
        <AdminSubNav />

      {/* Add new game */}
      <div
        style={{
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 16,
          maxWidth: 720,
          background: 'var(--surface)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Add a new game</div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={newGameName}
          onChange={(e) => setNewGameName(e.target.value)}
          placeholder="Game name…"
          style={{ padding: 10, minWidth: 280 }}
          disabled={creating}
        />

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={newGameActive}
            onChange={(e) => setNewGameActive(e.target.checked)}
            disabled={creating}
          />
          Active
        </label>

        <button
          onClick={createGame}
          style={{ padding: '10px 14px', cursor: creating ? 'not-allowed' : 'pointer' }}
          disabled={creating}
        >
          {creating ? 'Adding…' : 'Add game'}
        </button>

        {status && (
          <span style={{ opacity: 0.85 }}>
            <strong>{status}</strong>
          </span>
        )}
      </div>
    </div>

    {/* Search + refresh */}
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search games…"
        style={{ padding: 10, minWidth: 260 }}
      />
      <select
        value={tagFilterId}
        onChange={(e) => setTagFilterId(e.target.value)}
        style={{ padding: 10, minWidth: 200 }}
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <button onClick={loadAll} style={{ padding: '10px 14px' }}>
        Refresh
      </button>
    </div>

    {/* Bulk actions */}
    <div
      style={{
        border: '1px solid var(--border-strong)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        maxWidth: 900,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'var(--surface)',
      }}
    >
      <div style={{ fontWeight: 800 }}>Bulk:</div>
      <div style={{ opacity: 0.8 }}>
        Selected: <strong>{selectedGameIds.size}</strong>
      </div>

      <button onClick={selectAllFiltered} style={{ padding: '8px 10px', cursor: 'pointer' }} disabled={loading}>
        Select all (filtered)
      </button>

      <button onClick={clearBulkSelection} style={{ padding: '8px 10px', cursor: 'pointer' }}>
        Clear
      </button>

      <select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)} style={{ padding: '8px 10px' }}>
        <option value="">Add tag…</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>

      <button
        onClick={applyBulkAddTag}
        style={{ padding: '8px 12px', cursor: bulkApplying ? 'not-allowed' : 'pointer' }}
        disabled={bulkApplying || selectedGameIds.size === 0 || !bulkTagId}
      >
        {bulkApplying ? 'Applying…' : 'Apply tag to selected'}
      </button>
    </div>

    {loading ? (
      <p>Loading…</p>
    ) : (
      <div style={{ display: 'grid', gap: 12 }}>
        {filteredGames.map((g) => (
          <div
            key={g.id}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 10,
              padding: 14,
              display: 'grid',
              gap: 10,
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              {/* Left: checkbox + name */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={selectedGameIds.has(g.id)}
                  onChange={() => toggleGameSelected(g.id)}
                  style={{ marginTop: 4 }}
                />

                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{g.name}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    {g.is_active ? 'Active' : 'Inactive'}
                    {g.played_at ? ` • Played` : ''}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    Players:{' '}
                    {g.min_players && g.max_players
                      ? `${g.min_players}–${g.max_players}`
                      : g.min_players !== null
                        ? `Min ${g.min_players}`
                        : g.max_players !== null
                          ? `Max ${g.max_players}`
                          : '—'}
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEditor(g)} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                  Edit tags
                </button>

                <button
                  onClick={() => deleteGame(g)}
                  style={{ padding: '8px 12px', cursor: deletingId === g.id ? 'not-allowed' : 'pointer' }}
                  disabled={deletingId === g.id}
                >
                  {deletingId === g.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {g.tags.length === 0 ? (
                <span style={{ opacity: 0.6 }}>No tags</span>
              ) : (
                g.tags.map((t) => (
                  <span
                    key={t.id}
                    style={{
                      border: '1px solid var(--divider-soft)',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 13,
                      background: 'var(--page-background)',
                    }}
                    title={t.slug}
                  >
                    {t.label}
                  </span>
                ))
              )}
            </div>

            {/* Player counts */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>Players:</div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ opacity: 0.8 }}>Min</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={getPlayerDraft(g).min}
                  onChange={(e) => updatePlayerDraft(g.id, 'min', e.target.value)}
                  style={{ width: 80, padding: '6px 8px' }}
                />
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ opacity: 0.8 }}>Max</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={getPlayerDraft(g).max}
                  onChange={(e) => updatePlayerDraft(g.id, 'max', e.target.value)}
                  style={{ width: 80, padding: '6px 8px' }}
                />
              </label>
              <button
                onClick={() => savePlayerCounts(g)}
                style={{ padding: '6px 12px', cursor: playersSavingId === g.id ? 'not-allowed' : 'pointer' }}
                disabled={playersSavingId === g.id}
              >
                {playersSavingId === g.id ? 'Saving…' : 'Save players'}
              </button>
              {playerSaveMessages[g.id] ? (
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  <strong>{playerSaveMessages[g.id]}</strong>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Modal editor */}
    {editingGame && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(31, 42, 26, 0.45)',
          display: 'grid',
          placeItems: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 12,
            width: 'min(720px, 95vw)',
            padding: 16,
            border: '1px solid var(--border-strong)',
            boxShadow: '0 18px 40px rgba(63, 90, 42, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Edit tags</div>
              <div style={{ opacity: 0.8 }}>{editingGame.name}</div>
            </div>
            <button onClick={closeEditor} style={{ padding: '8px 12px', cursor: 'pointer' }} disabled={saving}>
              Close
            </button>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {tags.map((t) => (
              <label key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(t.id)}
                  onChange={() => toggleTag(t.id)}
                  disabled={saving}
                />
                <span>
                  {t.label} <span style={{ opacity: 0.6, fontSize: 12 }}>({t.slug})</span>
                </span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={saveTags}
              style={{ padding: '10px 14px', cursor: 'pointer' }}
              disabled={saving || !editingGameId}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={closeEditor} style={{ padding: '10px 14px', cursor: 'pointer' }} disabled={saving}>
              Cancel
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
            Saving replaces all tags for this game to match your selections.
          </div>
        </div>
      </div>
    )}
      </div>
  </main>
)
}
