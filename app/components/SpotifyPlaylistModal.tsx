'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '@/app/hooks/useBodyScrollLock'

export type PlaylistSuggestion = {
  id: string
  name: string
  ownerName: string | null
  imageUrl: string | null
  spotifyUrl: string
}

type SpotifyPlaylistResponse = {
  playlists?: PlaylistSuggestion[]
  error?: string
}

const MAX_QUERY_LENGTH = 100
const GENERIC_SEARCH_ERROR = 'We could not search Spotify right now. Please try again in a moment.'
const RATE_LIMIT_ERROR = 'Spotify is a little busy right now. Please wait a moment and try again.'

export default function SpotifyPlaylistModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<PlaylistSuggestion[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [lastSubmittedSearchQuery, setLastSubmittedSearchQuery] = useState('')
  const [hasEditedSinceLastSearch, setHasEditedSinceLastSearch] = useState(true)

  useBodyScrollLock(isOpen)

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const isSearchDisabled = loading || !trimmedQuery

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
        resetSearchSession()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function resetSearchSession() {
    setQuery('')
    setLoading(false)
    setError('')
    setResults([])
    setHasSearched(false)
    setLastSubmittedSearchQuery('')
    setHasEditedSinceLastSearch(true)
  }

  function openModal() {
    resetSearchSession()
    setIsOpen(true)
  }

  function closeModal() {
    setIsOpen(false)
    resetSearchSession()
  }

  async function submitSearch() {
    if (loading) {
      return
    }

    const nextQuery = trimmedQuery

    if (!nextQuery) {
      setError('Enter a vibe, genre, or mood to search Spotify playlists.')
      setResults([])
      setHasSearched(false)
      return
    }

    if (nextQuery === lastSubmittedSearchQuery && !hasEditedSinceLastSearch) {
      return
    }

    setQuery(nextQuery)
    setLoading(true)
    setError('')
    setHasSearched(true)
    setLastSubmittedSearchQuery(nextQuery)
    setHasEditedSinceLastSearch(false)

    try {
      const response = await fetch('/api/spotify/search-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: nextQuery,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as SpotifyPlaylistResponse

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data.error || RATE_LIMIT_ERROR)
        }

        throw new Error(data.error || GENERIC_SEARCH_ERROR)
      }

      setResults(Array.isArray(data.playlists) ? data.playlists : [])
    } catch (requestError) {
      console.error('Spotify playlist request failed.', requestError)
      setResults([])
      setError(requestError instanceof Error ? requestError.message : GENERIC_SEARCH_ERROR)
    } finally {
      setLoading(false)
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
                    Search by vibe, genre, or mood and open the best match directly in Spotify.
                  </p>
                </div>

                <form
                  className="spotify-playlist-modal__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submitSearch()
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
                        setQuery(event.target.value.slice(0, MAX_QUERY_LENGTH))
                        setHasEditedSinceLastSearch(true)
                        if (error) {
                          setError('')
                        }
                      }}
                      placeholder="80s rock"
                      className="spotify-playlist-modal__input"
                      autoComplete="off"
                      maxLength={MAX_QUERY_LENGTH}
                    />
                    <button
                      type="submit"
                      className="spotify-playlist-modal__search-button"
                      disabled={isSearchDisabled}
                      aria-disabled={isSearchDisabled}
                    >
                      {loading ? 'Searching Spotify...' : 'Search'}
                    </button>
                  </div>
                  <p className="spotify-playlist-modal__helper">
                    Up to {MAX_QUERY_LENGTH} characters. Searches only when you press Search.
                  </p>
                </form>

                {error ? (
                  <p className="spotify-playlist-modal__message spotify-playlist-modal__message--error" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="spotify-playlist-modal__results" aria-live="polite">
                  {!hasSearched && !loading ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message spotify-playlist-modal__message--strong">
                        Start with a mood, artist era, or genre.
                      </p>
                      <p className="spotify-playlist-modal__message">
                        Try something like “cozy acoustic”, “synthwave”, or “family game night”.
                      </p>
                    </div>
                  ) : null}

                  {loading ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message spotify-playlist-modal__message--strong">
                        Searching Spotify...
                      </p>
                      <p className="spotify-playlist-modal__message">
                        Looking for playlists that match your table vibe.
                      </p>
                    </div>
                  ) : null}

                  {!loading && hasSearched && !error && results.length === 0 ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message spotify-playlist-modal__message--strong">
                        No playlists matched that search.
                      </p>
                      <p className="spotify-playlist-modal__message">
                        Try a broader mood, a simpler genre, or a different activity-based phrase.
                      </p>
                    </div>
                  ) : null}

                  {!loading && results.length > 0 ? (
                    <>
                      <div className="spotify-playlist-modal__grid">
                        {results.map((playlist) => (
                          <a
                            key={playlist.id}
                            href={playlist.spotifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="spotify-playlist-card"
                            aria-label={`Open ${playlist.name} in Spotify (opens in a new tab)`}
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
                      <p className="spotify-playlist-modal__footer">
                        Powered by Spotify. Playlist links open in a new tab.
                      </p>
                    </>
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
