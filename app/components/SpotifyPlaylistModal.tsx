'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '@/app/hooks/useBodyScrollLock'
import type { PlaylistSuggestion } from '@/lib/spotify'

type SpotifyPlaylistResponse = {
  playlists?: PlaylistSuggestion[]
  error?: string
}

type FavoritePlaylistsResponse = {
  playlists?: Array<PlaylistSuggestion & { sortOrder?: number }>
  error?: string
}

type SpotifyModalTab = 'search-spotify' | 'search-our-favorites'

const MAX_QUERY_LENGTH = 100
const GENERIC_SEARCH_ERROR = 'Something went wrong while searching Spotify. Please try again in a moment.'
const RATE_LIMIT_ERROR = 'Spotify is receiving a lot of traffic right now. Please wait a moment and try again.'
const FAVORITES_ERROR = 'Unable to load your saved Spotify favorites right now. Please try again in a moment.'

const modalTabs: Array<{ id: SpotifyModalTab; label: string }> = [
  { id: 'search-spotify', label: 'Search Spotify' },
  { id: 'search-our-favorites', label: 'Search Our Favorites' },
]

const SPOTIFY_BUTTON_IMAGE_URL =
  'https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/Music.png'

type SpotifyPlaylistModalProps = {
  className?: string
  tabIndex?: number
}

export default function SpotifyPlaylistModal({ className, tabIndex }: SpotifyPlaylistModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SpotifyModalTab>('search-spotify')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<PlaylistSuggestion[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [lastSubmittedSearchQuery, setLastSubmittedSearchQuery] = useState('')
  const [favoritePlaylists, setFavoritePlaylists] = useState<Array<PlaylistSuggestion & { sortOrder?: number }>>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoritesLoaded, setFavoritesLoaded] = useState(false)
  const [favoritesError, setFavoritesError] = useState('')

  useBodyScrollLock(isOpen)

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const isDuplicateSearch = trimmedQuery.length > 0 && trimmedQuery === lastSubmittedSearchQuery
  const isSearchDisabled = loading || !trimmedQuery || isDuplicateSearch

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

  useEffect(() => {
    if (!isOpen || favoritesLoaded || favoritesLoading) {
      return
    }

    void loadFavoritePlaylists()
  }, [favoritesLoaded, favoritesLoading, isOpen])

  function resetSearchSession() {
    setActiveTab('search-spotify')
    setQuery('')
    setLoading(false)
    setError('')
    setResults([])
    setHasSearched(false)
    setLastSubmittedSearchQuery('')
  }

  function openModal() {
    resetSearchSession()
    setFavoritesLoaded(false)
    setFavoritesError('')
    setIsOpen(true)
  }

  function closeModal() {
    setIsOpen(false)
    resetSearchSession()
  }

  async function loadFavoritePlaylists() {
    setFavoritesLoading(true)
    setFavoritesError('')

    try {
      const response = await fetch('/api/spotify/favorite-playlists', { cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as FavoritePlaylistsResponse

      if (!response.ok) {
        throw new Error(data.error || FAVORITES_ERROR)
      }

      setFavoritePlaylists(Array.isArray(data.playlists) ? data.playlists : [])
      setFavoritesLoaded(true)
    } catch (requestError) {
      console.error('Spotify favorite playlists request failed.', requestError)
      setFavoritePlaylists([])
      setFavoritesError(requestError instanceof Error ? requestError.message : FAVORITES_ERROR)
    } finally {
      setFavoritesLoading(false)
    }
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

    if (nextQuery === lastSubmittedSearchQuery) {
      return
    }

    setQuery(nextQuery)
    setLoading(true)
    setError('')
    setHasSearched(true)
    setLastSubmittedSearchQuery(nextQuery)

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
        className={['spotify-playlist-button', className].filter(Boolean).join(' ')}
        onClick={openModal}
        aria-label="Open Spotify playlist search"
        tabIndex={tabIndex}
      >
        <img
          src={SPOTIFY_BUTTON_IMAGE_URL}
          alt=""
          className="floating-utility-button__image spotify-playlist-button__image"
          aria-hidden="true"
        />
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
                  <h2 id="spotify-playlist-modal-title" className="spotify-playlist-modal__title">
                    Find a playlist for the table vibe
                  </h2>
                  <p className="spotify-playlist-modal__subtitle">
                    Search by vibe, genre, or mood and open the best match directly in Spotify.
                  </p>
                </div>

                <div className="spotify-playlist-modal__tabs" role="tablist" aria-label="Spotify playlist utility tabs">
                  {modalTabs.map((tab) => {
                    const isSelected = tab.id === activeTab

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`spotify-playlist-tab-${tab.id}`}
                        aria-selected={isSelected}
                        aria-controls={`spotify-playlist-panel-${tab.id}`}
                        className={`spotify-playlist-modal__tab${isSelected ? ' spotify-playlist-modal__tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {activeTab === 'search-spotify' ? (
                  <div
                    id="spotify-playlist-panel-search-spotify"
                    className="spotify-playlist-modal__tab-panel"
                    role="tabpanel"
                    aria-labelledby="spotify-playlist-tab-search-spotify"
                  >
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
                        {isDuplicateSearch ? ' Update the search text to run another search.' : ''}
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
                            Search Spotify for a mood, artist era, or genre.
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
                            No playlists matched that search yet.
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
                                rel="noreferrer noopener"
                                className="spotify-playlist-card"
                                aria-label={`Open ${playlist.name} in Spotify (opens in a new tab)`}
                                title={`Open ${playlist.name} in Spotify`}
                              >
                                {playlist.imageUrl ? (
                                  <img
                                    src={playlist.imageUrl}
                                    alt=""
                                    className="spotify-playlist-card__image"
                                    loading="lazy"
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
                ) : (
                  <div
                    id="spotify-playlist-panel-search-our-favorites"
                    className="spotify-playlist-modal__tab-panel spotify-playlist-modal__tab-panel--favorites"
                    role="tabpanel"
                    aria-labelledby="spotify-playlist-tab-search-our-favorites"
                  >
                    <div className="spotify-playlist-modal__favorites-shell">
                      <div className="spotify-playlist-modal__favorites-hero">
                        <p className="spotify-playlist-modal__message spotify-playlist-modal__message--strong">
                          Curated favorites from the admin panel.
                        </p>
                        <p className="spotify-playlist-modal__message">
                          Add playlists in Admin → App configurations and they will appear here for one-click access.
                        </p>
                      </div>

                      {favoritesError ? (
                        <p className="spotify-playlist-modal__message spotify-playlist-modal__message--error" role="alert">
                          {favoritesError}
                        </p>
                      ) : null}

                      {favoritesLoading ? (
                        <div className="spotify-playlist-modal__empty-state">
                          <p className="spotify-playlist-modal__message spotify-playlist-modal__message--strong">
                            Loading favorite playlists...
                          </p>
                          <p className="spotify-playlist-modal__message">
                            Pulling in the playlists configured from the admin panel.
                          </p>
                        </div>
                      ) : null}

                      {!favoritesLoading && !favoritesError && favoritePlaylists.length === 0 ? (
                        <div className="spotify-playlist-modal__empty-state">
                          <p className="spotify-playlist-modal__message spotify-playlist-modal__message--strong">
                            No favorite playlists have been configured yet.
                          </p>
                          <p className="spotify-playlist-modal__message">
                            Add a playlist link in the admin area to populate this section.
                          </p>
                        </div>
                      ) : null}

                      {!favoritesLoading && favoritePlaylists.length > 0 ? (
                        <>
                          <div className="spotify-playlist-modal__grid">
                            {favoritePlaylists.map((playlist) => (
                              <a
                                key={playlist.id}
                                href={playlist.spotifyUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="spotify-playlist-card"
                                aria-label={`Open ${playlist.name} in Spotify (opens in a new tab)`}
                                title={`Open ${playlist.name} in Spotify`}
                              >
                                {playlist.imageUrl ? (
                                  <img
                                    src={playlist.imageUrl}
                                    alt=""
                                    className="spotify-playlist-card__image"
                                    loading="lazy"
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
                            Curated by your admins. Playlist links open in a new tab.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
