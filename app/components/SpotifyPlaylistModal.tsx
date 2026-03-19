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

type SpotifyPlaylistResponse = {
  playlists?: PlaylistSuggestion[]
  error?: string
}

export default function SpotifyPlaylistModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<PlaylistSuggestion[]>([])
  const [hasSearched, setHasSearched] = useState(false)
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

  async function handleSearch() {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setError('Enter a vibe, genre, or mood to search Spotify playlists.')
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const response = await fetch('/api/spotify/search-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery }),
      })

      const data = (await response.json().catch(() => ({}))) as SpotifyPlaylistResponse

      if (!response.ok) {
        throw new Error(data.error || 'Unable to search Spotify playlists right now.')
      }

      setResults(Array.isArray(data.playlists) ? data.playlists : [])
    } catch (searchError) {
      console.error('Spotify playlist search request failed.', searchError)
      setResults([])
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Unable to search Spotify playlists right now.'
      )
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
                    Search for a vibe, genre, or mood.
                  </p>
                </div>

                <form
                  className="spotify-playlist-modal__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleSearch()
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
                    <button type="submit" className="spotify-playlist-modal__search-button" disabled={loading}>
                      {loading ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                </form>

                {error ? (
                  <p className="spotify-playlist-modal__message spotify-playlist-modal__message--error" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="spotify-playlist-modal__results" aria-live="polite">
                  {!hasSearched && !loading ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message">
                        Search for a vibe, genre, or mood.
                      </p>
                    </div>
                  ) : null}

                  {loading ? (
                    <div className="spotify-playlist-modal__empty-state">
                      <p className="spotify-playlist-modal__message">Looking for playlists…</p>
                    </div>
                  ) : null}

                  {!loading && hasSearched && !error && results.length === 0 ? (
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
