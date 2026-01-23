'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

const STORAGE_KEY = 'cabbagePostsByTournament'

type Tournament = {
  id: string
  label: string
  year_start: number
  year_end: number
  is_active: boolean
}

type Player = {
  id: string
  display_name: string
}

type PostEntry = {
  id: string
  tournamentId: string
  authorId: string
  authorName: string
  message: string
  createdAt: string
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export default function PostsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [postsByTournament, setPostsByTournament] = useState<Record<string, PostEntry[]>>({})
  const [draftMessage, setDraftMessage] = useState('')
  const [draftAuthorId, setDraftAuthorId] = useState('')
  const [status, setStatus] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, PostEntry[]>
        setPostsByTournament(parsed)
      } catch {
        setPostsByTournament({})
      }
    }
  }, [isMounted])

  useEffect(() => {
    if (!isMounted) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(postsByTournament))
  }, [isMounted, postsByTournament])

  useEffect(() => {
    const loadTournaments = async () => {
      const res = await fetch('/api/tournaments', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus(json.error || 'Failed to load tournaments')
        return
      }

      const list: Tournament[] = json.tournaments ?? []
      setTournaments(list)

      if (!selectedTournamentId) {
        const active = list.find((t) => t.is_active)
        if (active) {
          setSelectedTournamentId(active.id)
        } else if (list[0]) {
          setSelectedTournamentId(list[0].id)
        }
      }
    }

    const loadPlayers = async () => {
      const res = await fetch('/api/players', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus(json.error || 'Failed to load players')
        return
      }

      setPlayers(json.players ?? [])
    }

    loadTournaments()
    loadPlayers()
  }, [])

  const activePosts = postsByTournament[selectedTournamentId] ?? []

  const selectedTournamentLabel = useMemo(() => {
    if (!tournaments.length) return 'Active tournament'

    return (
      tournaments.find((t) => t.id === selectedTournamentId)?.label ||
      tournaments.find((t) => t.is_active)?.label ||
      tournaments[0]?.label ||
      'Active tournament'
    )
  }, [selectedTournamentId, tournaments])

  const handleSubmit = () => {
    const trimmed = draftMessage.trim()
    if (!selectedTournamentId) {
      setStatus('Select a tournament to post in.')
      return
    }

    if (!draftAuthorId) {
      setStatus('Choose a player to post as.')
      return
    }

    if (!trimmed) {
      setStatus('Write a message before posting.')
      return
    }

    const author = players.find((player) => player.id === draftAuthorId)
    const authorName = author?.display_name ?? 'Unknown player'

    const entry: PostEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      tournamentId: selectedTournamentId,
      authorId: draftAuthorId,
      authorName,
      message: trimmed,
      createdAt: new Date().toISOString(),
    }

    setPostsByTournament((prev) => ({
      ...prev,
      [selectedTournamentId]: [...(prev[selectedTournamentId] ?? []), entry],
    }))

    setDraftMessage('')
    setStatus('')
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
        <PageTitle>Posts</PageTitle>

        <section className="posts__header">
          <div>
            <h2 className="posts__headline">Cabbage Conversation Thread</h2>
            <p className="posts__subhead">
              Keep the chatter organized by tournament year. New posts default to the active season.
            </p>
          </div>
          <div className="posts__header-status">
            <span className="posts__header-label">Viewing posts from</span>
            <strong>{selectedTournamentLabel}</strong>
          </div>
        </section>

        {tournaments.length > 0 && (
          <div className="posts__controls">
            <label className="posts__control">
              <span className="posts__control-label">Tournament year</span>
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.year_start}-{tournament.year_end} {tournament.is_active ? '(Active)' : ''} —{' '}
                    {tournament.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="posts__control-note">
              {activePosts.length} {activePosts.length === 1 ? 'post' : 'posts'} saved for this year
            </div>
          </div>
        )}

        {status && <div className="posts__status">{status}</div>}

        <section className="posts__thread">
          {activePosts.length === 0 ? (
            <div className="posts__empty">
              <p>No posts yet for this tournament year.</p>
              <p>Kick things off below as the first commenter.</p>
            </div>
          ) : (
            activePosts.map((post, index) => (
              <article key={post.id} className="posts__entry">
                <div className="posts__entry-meta">
                  <div className="posts__avatar" aria-hidden="true">
                    {getInitials(post.authorName) || '??'}
                  </div>
                </div>
                <div className="posts__entry-body">
                  <header className="posts__entry-header">
                    <div>
                      <strong className="posts__entry-author">{post.authorName}</strong>
                      <span className="posts__entry-time">{formatDateTime(post.createdAt)}</span>
                    </div>
                    <span className="posts__entry-index">#{index + 1}</span>
                  </header>
                  <p className="posts__entry-message">{post.message}</p>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="posts__composer">
          <div className="posts__composer-header">
            <h3>Start a new post</h3>
            <p>Share a thought, update, or celebratory roast with the rest of the bracket.</p>
          </div>
          <div className="posts__composer-body">
            <label className="posts__control">
              <span className="posts__control-label">Posting as</span>
              <select
                value={draftAuthorId}
                onChange={(event) => setDraftAuthorId(event.target.value)}
              >
                <option value="">Select a player</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.display_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="posts__control posts__control--full">
              <span className="posts__control-label">Message</span>
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Drop your thoughts here..."
                rows={4}
              />
            </label>

            <div className="posts__composer-actions">
              <button type="button" onClick={handleSubmit} className="posts__submit">
                Post comment
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
