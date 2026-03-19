'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '@/app/hooks/useBodyScrollLock'

export type PlaylistSuggestion = {
  id: string
  name: string
  ownerName: string | null
  imageUrl: string | null
  spotifyUrl: string
}

type SpotifyRequestPreview = {
  mode: 'test'
  query: string
  hasClientId: boolean
  hasClientSecret: boolean
  tokenRequest: {
    url: string
    method: 'POST'
    headers: {
      authorization: string
      contentType: string
    }
    body: string
  }
  searchRequest: {
    url: string
    method: 'GET'
    headers: {
      authorization: string
    }
    queryParams: {
      q: string
      type: 'playlist'
      limit: '6'
    }
  }
}

type SpotifyPlaylistDiagnostics = {
  kind: 'token' | 'search'
  reason: 'missing_credentials' | 'upstream_failure' | 'invalid_response'
  hasClientId: boolean
  hasClientSecret: boolean
  upstreamStatus: number | null
}

type SpotifyPlaylistResponse = {
  playlists?: PlaylistSuggestion[]
  error?: string
  test?: SpotifyRequestPreview
  diagnostics?: SpotifyPlaylistDiagnostics
}

export default function SpotifyPlaylistModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<PlaylistSuggestion[]>([])
  const [requestPreview, setRequestPreview] = useState<SpotifyRequestPreview | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeAction, setActiveAction] = useState<'search' | 'preview' | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useBodyScrollLock(isOpen)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function openModal() {
    setIsOpen(true)
  }

  function closeModal() {
    setIsOpen(false)
  }

  async function submitRequest(mode: 'search' | 'preview') {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setError('Enter a vibe, genre, or mood to search Spotify playlists.')
      setResults([])
      setRequestPreview(null)
      setHasSearched(false)
      return
    }

    setLoading(true)
    setActiveAction(mode)
    setError('')
    setHasSearched(mode === 'search')

    try {
      const response = await fetch('/api/spotify/search-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmedQuery,
          testMode: mode === 'preview',
        }),
      })

      const data = (await response.json().catch(() => ({}))) as SpotifyPlaylistResponse

      if (!response.ok) {
        const diagnostics = data.diagnostics
        const diagnosticSummary = diagnostics
          ? [
              `kind=${diagnostics.kind}`,
              `reason=${diagnostics.reason}`,
              `hasClientId=${diagnostics.hasClientId ? 'yes' : 'no'}`,
              `hasClientSecret=${diagnostics.hasClientSecret ? 'yes' : 'no'}`,
              diagnostics.upstreamStatus !== null ? `upstreamStatus=${diagnostics.upstreamStatus}` : null,
            ]
              .filter(Boolean)
              .join(', ')
          : ''

        throw new Error(
          diagnosticSummary
            ? `${data.error || 'Unable to search Spotify playlists right now.'} (${diagnosticSummary})`
            : data.error || 'Unable to search Spotify playlists right now.'
        )
      }

      setRequestPreview(data.test ?? null)
      setResults(mode === 'search' && Array.isArray(data.playlists) ? data.playlists : [])
    } catch (requestError) {
      console.error('Spotify playlist request failed.', requestError)
      setResults([])
      setRequestPreview(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to search Spotify playlists right now.'
      )
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  return (
    <>
      <button
        type="button"
        className="spotify-playlist-button"
        onClick={openModal}
        aria-label="Open Spotify playlist search"
      >
        <span className="spotify-playlist-button__icon" aria-hidden="true">
          ♫
        </span>
        <span className="spotify-playlist-button__label">Spotify</span>
      </button>

      {isOpen && isMounted
        ? createPortal(
            <div className="player-card-modal spotify-playlist-modal" role="dialog" aria-modal="true" aria-labelledby="spotify-playlist-modal-title">
              <div className="player-card-modal__backdrop" onClick={closeModal} />
              <div
                className="player-card-modal__content spotify-playlist-modal__content"
                role="document"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeModal}
                  aria-label="Close Spotify playlist search"
                >
                  ✕
                </button>

                <div className="spotify-playlist-modal__header">
                  <p className="spotify-playlist-modal__eyebrow">Spotify playlist utility</p>
                  <h2 id="spotify-playlist-modal-title" className="spotify-playlist-modal__title">
                    Find a playlist for the table vibe
                  </h2>
                  <p className="spotify-playlist-modal__subtitle">
                    Search for a vibe, genre, or mood, or preview the exact Spotify request payload.
                  </p>
                </div>

                <form
                  className="spotify-playlist-modal__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submitRequest('search')
                  }}
                >
                  <label className="spotify-playlist-modal__label" htmlFor="spotify-playlist-query">
                    Music preference
                  </label>
                  <div className="spotify-playlist-modal__controls">
                    <input
                      id="spotify-playlist-query"
                      type="text"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        if (error) {
                          setError('')
                        }
                      }}
                      placeholder="80s rock"
                      className="spotify-playlist-modal__input"
                      autoComplete="off"
                    />
                    <div className="spotify-playlist-modal__actions">
                      <button
                        type="submit"
                        className="spotify-playlist-modal__search-button"
                        disabled={loading}
                      >
                        {loading && activeAction === 'search' ? 'Searching…' : 'Search'}
                      </button>
                      <button
                        type="button"
                        className="spotify-playlist-modal__preview-button"
                        onClick={() => void submitRequest('preview')}
                        disabled={loading}
                      >
                        {loading && activeAction === 'preview' ? 'Preparing…' : 'Preview request'}
                      </button>
                    </div>
                  </div>
                </form>

                {error ? (
                  <p className="spotify-playlist-modal__message spotify-playlist-modal__message--error" role="alert">
                    {error}
                  </p>
                ) : null}

                {requestPreview ? (
                  <div className="spotify-playlist-preview" aria-live="polite">
                    <div className="spotify-playlist-preview__header">
                      <p className="spotify-playlist-preview__title">Spotify request preview</p>
                      <p className="spotify-playlist-preview__subtitle">
                        Safe debug output showing what this app is prepared to send to Spotify.
                      </p>
                    </div>
                    <div className="spotify-playlist-preview__meta">
                      <span>Client ID present: {requestPreview.hasClientId ? 'Yes' : 'No'}</span>
                      <span>Client secret present: {requestPreview.hasClientSecret ? 'Yes' : 'No'}</span>
                    </div>
                    <pre className="spotify-playlist-preview__code">
{JSON.stringify(requestPreview, null, 2)}
                    </pre>
                  </div>
                ) : null}

                <div className="spotify-playlist-modal__results" aria-live="polite">
                  {!hasSearched && !loading && !requestPreview ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message">
                        Search for a vibe, genre, or mood.
                      </p>
                    </div>
                  ) : null}

                  {loading && activeAction === 'search' ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message">Looking for playlists…</p>
                    </div>
                  ) : null}

                  {!loading && hasSearched && !error && !requestPreview && results.length === 0 ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message">
                        No playlists matched that search. Try a broader vibe or genre.
                      </p>
                    </div>
                  ) : null}

                  {!loading && results.length > 0 ? (
                    <div className="spotify-playlist-modal__grid">
                      {results.map((playlist) => (
                        <a
                          key={playlist.id}
                          href={playlist.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="spotify-playlist-card"
                        >
                          {playlist.imageUrl ? (
                            <img
                              src={playlist.imageUrl}
                              alt=""
                              className="spotify-playlist-card__image"
                            />
                          ) : (
                            <div className="spotify-playlist-card__image spotify-playlist-card__image--placeholder" aria-hidden="true">
                              ♫
                            </div>
                          )}
                          <div className="spotify-playlist-card__body">
                            <p className="spotify-playlist-card__name">{playlist.name}</p>
                            <p className="spotify-playlist-card__owner">
                              {playlist.ownerName ? `By ${playlist.ownerName}` : 'Spotify playlist'}
                            </p>
                            <span className="spotify-playlist-card__cta">Open in Spotify ↗</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
