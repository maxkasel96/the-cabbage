'use client'

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
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
  images: string[]
  createdAt: string
}

type PostRecord = {
  id: string
  tournament_id: string
  author_id: string
  author_name: string
  message: string
  images?: string[] | string | null
  created_at: string
}

const allowedRichTextTags = new Set(['A', 'B', 'BR', 'EM', 'I', 'LI', 'OL', 'P', 'S', 'STRONG', 'U', 'UL'])
const allowedImageSources = [/^https?:\/\//i, /^data:image\/(png|jpe?g|gif|webp);base64,/i]
const MAX_POST_LENGTH = 5000

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

    Array.from(node.attributes).forEach((attr) => {
      if (node.tagName === 'A' && (attr.name === 'href' || attr.name === 'rel' || attr.name === 'target')) {
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

const extractImageSources = (value: string) => {
  if (!value) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  const images = Array.from(doc.body.querySelectorAll('img'))
    .map((img) => img.getAttribute('src') ?? '')
    .filter(Boolean)
  return images.filter((src) => allowedImageSources.some((pattern) => pattern.test(src)))
}

const normalizeImageList = (value: PostRecord['images']) => {
  const list = Array.isArray(value)
    ? value.filter((image): image is string => typeof image === 'string')
    : []

  if (list.length > 0) {
    return list.filter((src) => allowedImageSources.some((pattern) => pattern.test(src)))
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((image): image is string => typeof image === 'string')
          .filter((src) => allowedImageSources.some((pattern) => pattern.test(src)))
      }
    } catch {
      // Ignore malformed JSON and fall through to direct string handling.
    }

    if (allowedImageSources.some((pattern) => pattern.test(value))) {
      return [value]
    }
  }

  return []
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
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [editorStatus, setEditorStatus] = useState('')
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const lastValidContentRef = useRef({ html: '', text: '' })
  const isRevertingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Drop your thoughts here...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'posts__editor-input',
        'data-placeholder': 'Drop your thoughts here...',
        'aria-label': 'Message',
      },
    },
    onUpdate: ({ editor }) => {
      if (isRevertingRef.current) {
        isRevertingRef.current = false
        return
      }

      const text = editor.getText()
      if (text.length > MAX_POST_LENGTH) {
        setEditorStatus(`Messages are limited to ${MAX_POST_LENGTH.toLocaleString()} characters.`)
        isRevertingRef.current = true
        editor.commands.setContent(lastValidContentRef.current.html, false)
        editor.commands.focus('end')
        return
      }

      setEditorStatus('')
      const html = editor.getHTML()
      lastValidContentRef.current = { html, text }
      setDraftMessage(html)
    },
  })

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
        const storedImages = normalizeImageList(post.images)
        const fallbackImages = storedImages.length ? storedImages : extractImageSources(post.message)
        const entry: PostEntry = {
          id: post.id,
          tournamentId: post.tournament_id,
          authorId: post.author_id,
          authorName: post.author_name,
          message: sanitizeRichText(post.message),
          images: fallbackImages,
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
    const rawMessage = editor?.getHTML() ?? draftMessage
    const sanitized = sanitizeRichText(rawMessage)
    const images = attachedImages
    const plainText = (editor?.getText() ?? getPlainText(sanitized)).replace(/\u00a0/g, ' ').trim()
    if (!selectedTournamentId) {
      setStatus('Select a tournament to post in.')
      return
    }

    if (!draftAuthorId) {
      setStatus('Choose a player to post as.')
      return
    }

    if (!plainText && images.length === 0) {
      setStatus('Write a message or attach images before posting.')
      return
    }

    if (plainText.length > MAX_POST_LENGTH) {
      setEditorStatus(`Messages are limited to ${MAX_POST_LENGTH.toLocaleString()} characters.`)
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
        images,
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

    const normalizedImages = normalizeImageList(post.images)
    const entry: PostEntry = {
      id: post.id,
      tournamentId: post.tournament_id,
      authorId: post.author_id,
      authorName: post.author_name,
      message: sanitizeRichText(post.message),
      images: normalizedImages.length > 0 ? normalizedImages : images,
      createdAt: post.created_at,
    }

    setPostsByTournament((prev) => ({
      ...prev,
      [entry.tournamentId]: [...(prev[entry.tournamentId] ?? []), entry],
    }))

    setDraftMessage('')
    setAttachedImages([])
    editor?.commands.clearContent()
    lastValidContentRef.current = { html: '', text: '' }
    setEditorStatus('')
    setStatus('')
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

    const validImages = images.filter((src) => allowedImageSources.some((pattern) => pattern.test(src)))
    if (validImages.length) {
      setAttachedImages((prev) => [...prev, ...validImages])
    }

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
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const openLightbox = (images: string[], index: number) => {
    if (!images.length) return
    setLightboxImages(images)
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
    setLightboxImages([])
    setLightboxIndex(0)
  }

  const showPreviousImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
  }

  const showNextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)
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
                  {Array.isArray(post.images) && post.images.length > 0 && (
                    <div className="posts__entry-images">
                      {post.images.map((src, imageIndex) => (
                        <button
                          key={`${post.id}-image-${imageIndex}`}
                          type="button"
                          className="posts__entry-thumbnail"
                          onClick={() => openLightbox(post.images, imageIndex)}
                          aria-label={`Open image ${imageIndex + 1} of ${post.images.length}`}
                        >
                          <img src={src} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
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
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    aria-label="Bold"
                    disabled={!editor}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    aria-label="Italic"
                    disabled={!editor}
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    aria-label="Underline"
                    disabled={!editor}
                  >
                    <span style={{ textDecoration: 'underline' }}>U</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    aria-label="Strikethrough"
                    disabled={!editor}
                  >
                    <span style={{ textDecoration: 'line-through' }}>S</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    aria-label="Bulleted list"
                    disabled={!editor}
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    aria-label="Numbered list"
                    disabled={!editor}
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    aria-label="Blockquote"
                    disabled={!editor}
                  >
                    “Quote”
                  </button>
                  <button type="button" onClick={handleAddLink} aria-label="Insert link" disabled={!editor}>
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().undo().run()}
                    aria-label="Undo"
                    disabled={!editor}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().redo().run()}
                    aria-label="Redo"
                    disabled={!editor}
                  >
                    Redo
                  </button>
                </div>
                <EditorContent editor={editor} />
              </div>
              {editorStatus && <div className="posts__editor-status">{editorStatus}</div>}
            </label>

            <div className="posts__attachments">
              <span className="posts__control-label">Post attachments</span>
              <p className="posts__attachments-note">Upload images to include as thumbnails in your post.</p>
              <button type="button" className="posts__attachments-button" onClick={triggerImagePicker}>
                Add images
              </button>
              {attachedImages.length > 0 && (
                <div className="posts__attachments-preview" aria-label="Attached images">
                  {attachedImages.map((src, index) => (
                    <img
                      key={`attachment-${index}`}
                      className="posts__attachments-thumbnail"
                      src={src}
                      alt={`Attachment ${index + 1}`}
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              <input
                ref={imageInputRef}
                className="posts__editor-input-file"
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddImages}
              />
            </div>

            <div className="posts__composer-actions">
              <button type="button" onClick={handleSubmit} className="posts__submit">
                Post comment
              </button>
            </div>
          </div>
        </section>
        {isLightboxOpen && (
          <div className="posts__lightbox" role="dialog" aria-modal="true">
            <button type="button" className="posts__lightbox-backdrop" onClick={closeLightbox} aria-label="Close" />
            <div className="posts__lightbox-content">
              <button type="button" className="posts__lightbox-close" onClick={closeLightbox} aria-label="Close gallery">
                ×
              </button>
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  className="posts__lightbox-nav posts__lightbox-nav--prev"
                  onClick={showPreviousImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>
              )}
              <img
                className="posts__lightbox-image"
                src={lightboxImages[lightboxIndex]}
                alt=""
                loading="lazy"
              />
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  className="posts__lightbox-nav posts__lightbox-nav--next"
                  onClick={showNextImage}
                  aria-label="Next image"
                >
                  ›
                </button>
              )}
              <div className="posts__lightbox-counter">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
