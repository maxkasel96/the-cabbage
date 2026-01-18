'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '@/app/components/Nav'

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
  tags: Tag[]
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')

  const [search, setSearch] = useState('')

  // Editor state
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Add new game state
  const [newGameName, setNewGameName] = useState('')
  const [newGameActive, setNewGameActive] = useState(true)
  const [creating, setCreating] = useState(false)

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
  const base = !q
    ? games
    : games.filter((g) => g.name.toLowerCase().includes(q))

  return [...base].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
  }, [games, search])

  function openEditor(game: Game) {
    if (!game?.id) {
      setStatus('Cannot edit tags: this game is missing an id. Try Refresh.')
      return
    }

    setEditingGame(game)
    setEditingGameId(game.id)
    setSelectedTagIds(new Set((game.tags ?? []).map((t) => t.id).filter(Boolean)))
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

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <Nav />
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Admin: Games & Tags</h1>

      {/* Add new game */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 10,
          padding: 14,
          marginBottom: 16,
          maxWidth: 720,
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
        <button onClick={loadAll} style={{ padding: '10px 14px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredGames.map((g) => (
            <div
              key={g.id}
              style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, display: 'grid', gap: 10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{g.name}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    {g.is_active ? 'Active' : 'Inactive'}
                    {g.played_at ? ` • Played` : ''}
                  </div>
                </div>

                <button onClick={() => openEditor(g)} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                  Edit tags
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {g.tags.length === 0 ? (
                  <span style={{ opacity: 0.6 }}>No tags</span>
                ) : (
                  g.tags.map((t) => (
                    <span
                      key={t.id}
                      style={{
                        border: '1px solid #ccc',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 13,
                      }}
                      title={t.slug}
                    >
                      {t.label}
                    </span>
                  ))
                )}
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
            background: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: 'min(720px, 95vw)', padding: 16 }}>
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
    </main>
  )
}

