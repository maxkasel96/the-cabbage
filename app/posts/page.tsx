'use client'

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

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

type PostRecord = {
  id: string
  tournament_id: string
  author_id: string
  author_name: string
  message: string
  created_at: string
}

const allowedRichTextTags = new Set(['A', 'B', 'BR', 'EM', 'I', 'IMG', 'LI', 'OL', 'P', 'S', 'STRONG', 'U', 'UL'])

const sanitizeRichText = (value: string) => {
  if (!value) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  const nodes = Array.from(doc.body.querySelectorAll('*'))

  nodes.forEach((node) => {
    if (!allowedRichTextTags.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes))
      return
    }

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? ''
      const isSafe = /^https?:\/\//i.test(href) || href.startsWith('mailto:')
      if (!isSafe) {
        node.removeAttribute('href')
      } else {
        node.setAttribute('rel', 'noreferrer noopener')
        node.setAttribute('target', '_blank')
      }
    }

    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') ?? ''
      const isSafe =
        /^https?:\/\//i.test(src) ||
        /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)
      if (!isSafe) {
        node.remove()
        return
      }
    }

    Array.from(node.attributes).forEach((attr) => {
      if (node.tagName === 'A' && (attr.name === 'href' || attr.name === 'rel' || attr.name === 'target')) {
        return
      }

      if (node.tagName === 'IMG' && (attr.name === 'src' || attr.name === 'alt')) {
        return
      }

      node.removeAttribute(attr.name)
    })
  })

  return doc.body.innerHTML
}

const getPlainText = (value: string) => {
  if (!value) return ''
  const wrapper = document.createElement('div')
  wrapper.innerHTML = value
  return wrapper.textContent?.replace(/\u00a0/g, ' ').trim() ?? ''
}

const escapeHtmlAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const hasImages = (value: string) => {
  if (!value) return false
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  return doc.body.querySelector('img') !== null
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
  const editorRef = useRef<HTMLDivElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

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

    const loadPosts = async () => {
      const res = await fetch('/api/posts', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus(json.error || 'Failed to load posts')
        return
      }

      const list: PostRecord[] = json.posts ?? []
      const grouped = list.reduce<Record<string, PostEntry[]>>((acc, post) => {
        const entry: PostEntry = {
          id: post.id,
          tournamentId: post.tournament_id,
          authorId: post.author_id,
          authorName: post.author_name,
          message: post.message,
          createdAt: post.created_at,
        }
        acc[entry.tournamentId] = [...(acc[entry.tournamentId] ?? []), entry]
        return acc
      }, {})

      setPostsByTournament(grouped)
    }

    loadTournaments()
    loadPlayers()
    loadPosts()
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

  const handleSubmit = async () => {
    const sanitized = sanitizeRichText(draftMessage)
    const plainText = getPlainText(sanitized)
    const containsImages = hasImages(sanitized)
    if (!selectedTournamentId) {
      setStatus('Select a tournament to post in.')
      return
    }

    if (!draftAuthorId) {
      setStatus('Choose a player to post as.')
      return
    }

    if (!plainText && !containsImages) {
      setStatus('Write a message or attach images before posting.')
      return
    }

    const author = players.find((player) => player.id === draftAuthorId)
    const authorName = author?.display_name ?? 'Unknown player'
    setStatus('Posting...')

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournament_id: selectedTournamentId,
        author_id: draftAuthorId,
        author_name: authorName,
        message: sanitized,
      }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to save post')
      return
    }

    const post = json.post as PostRecord | undefined
    if (!post) {
      setStatus('Post saved, but response was incomplete.')
      return
    }

    const entry: PostEntry = {
      id: post.id,
      tournamentId: post.tournament_id,
      authorId: post.author_id,
      authorName: post.author_name,
      message: post.message,
      createdAt: post.created_at,
    }

    setPostsByTournament((prev) => ({
      ...prev,
      [entry.tournamentId]: [...(prev[entry.tournamentId] ?? []), entry],
    }))

    setDraftMessage('')
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    setStatus('')
  }

  const updateDraftMessage = () => {
    if (!editorRef.current) return
    setDraftMessage(editorRef.current.innerHTML)
  }

  const applyFormatting = (command: string, value?: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()

    if (command === 'createLink') {
      const url = value?.trim() ?? ''
      if (!url) return
      document.execCommand(command, false, url)
      updateDraftMessage()
      return
    }

    document.execCommand(command, false)
    updateDraftMessage()
  }

  const insertHtml = (html: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand('insertHTML', false, html)
    updateDraftMessage()
  }

  const handleAddImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const images = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result ?? ''))
            reader.onerror = () => reject(new Error('Failed to read image.'))
            reader.readAsDataURL(file)
          })
      )
    ).catch(() => [])

    images.forEach((src, index) => {
      if (!src) return
      const file = files[index]
      const alt = file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'Post image'
      insertHtml(`<p><img src="${src}" alt="${escapeHtmlAttribute(alt)}" /></p>`)
    })

    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const triggerImagePicker = () => {
    imageInputRef.current?.click()
  }

  const handleAddLink = () => {
    const url = window.prompt('Enter a URL to link to:')
    if (!url) return
    applyFormatting('createLink', url)
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
                  <div
                    className="posts__entry-message"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.message) }}
                  />
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
              <div className="posts__editor">
                <div className="posts__editor-toolbar" role="toolbar" aria-label="Formatting">
                  <button type="button" onClick={() => applyFormatting('bold')} aria-label="Bold">
                    <strong>B</strong>
                  </button>
                  <button type="button" onClick={() => applyFormatting('italic')} aria-label="Italic">
                    <em>I</em>
                  </button>
                  <button type="button" onClick={() => applyFormatting('underline')} aria-label="Underline">
                    <span style={{ textDecoration: 'underline' }}>U</span>
                  </button>
                  <button type="button" onClick={() => applyFormatting('insertUnorderedList')} aria-label="Bulleted list">
                    • List
                  </button>
                  <button type="button" onClick={() => applyFormatting('insertOrderedList')} aria-label="Numbered list">
                    1. List
                  </button>
                  <button type="button" onClick={handleAddLink} aria-label="Insert link">
                    Link
                  </button>
                  <button type="button" onClick={triggerImagePicker} aria-label="Attach images">
                    Images
                  </button>
                </div>
                <div
                  ref={editorRef}
                  className="posts__editor-input"
                  contentEditable
                  role="textbox"
                  aria-label="Message"
                  data-placeholder="Drop your thoughts here..."
                  onInput={updateDraftMessage}
                />
                <input
                  ref={imageInputRef}
                  className="posts__editor-input-file"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddImages}
                />
              </div>
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
