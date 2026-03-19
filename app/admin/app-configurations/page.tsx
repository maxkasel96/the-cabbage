'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import AdminSubNav from '@/app/components/AdminSubNav'
import Nav from '@/app/components/Nav'
import PageTitle from '@/app/components/PageTitle'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type AdminSpotifyFavoritePlaylist = {
  id: string
  spotify_playlist_id: string
  playlist_name: string
  owner_name: string | null
  image_url: string | null
  spotify_url: string
  sort_order: number
  created_at: string
  updated_at: string
}

type AdminSpotifyFavoritePlaylistsResponse = {
  playlists?: AdminSpotifyFavoritePlaylist[]
  error?: string
}

const SUGGESTED_LINK_FORMAT = 'https://open.spotify.com/playlist/{playlistId}'

export default function AdminAppConfigurationsPage() {
  const [playlists, setPlaylists] = useState<AdminSpotifyFavoritePlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('100')
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const sortedPlaylists = useMemo(
    () =>
      [...playlists].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.playlist_name.localeCompare(b.playlist_name)
      ),
    [playlists]
  )

  useEffect(() => {
    let isMounted = true
    const supabase = supabaseBrowser()

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      const token = data.session?.access_token ?? null
      setAccessToken(token)
      void loadPlaylists(token)
    })

    const { data: authChange } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!isMounted) return
      setAccessToken(session?.access_token ?? null)
    })

    return () => {
      isMounted = false
      authChange.subscription.unsubscribe()
    }
  }, [])

  function getAuthHeaders(tokenOverride?: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const token = tokenOverride ?? accessToken

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  async function loadPlaylists(tokenOverride?: string | null) {
    setLoading(true)
    setStatus('')

    const response = await fetch('/api/admin/app-configurations/spotify-favorite-playlists', {
      headers: getAuthHeaders(tokenOverride),
      cache: 'no-store',
    })

    const data = (await response.json().catch(() => ({}))) as AdminSpotifyFavoritePlaylistsResponse

    if (!response.ok) {
      setStatus(data.error || 'Failed to load Spotify favorite playlists.')
      setLoading(false)
      return
    }

    setPlaylists(Array.isArray(data.playlists) ? data.playlists : [])
    setLoading(false)
  }

  async function createPlaylist() {
    const trimmedUrl = spotifyUrl.trim()
    const nextSortOrder = Number.parseInt(sortOrder.trim() || '100', 10)

    if (!trimmedUrl) {
      setStatus('Spotify playlist link is required.')
      return
    }

    setCreating(true)
    setStatus('')

    const response = await fetch('/api/admin/app-configurations/spotify-favorite-playlists', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        spotifyUrl: trimmedUrl,
        sortOrder: Number.isFinite(nextSortOrder) ? nextSortOrder : 100,
      }),
    })

    const data = (await response.json().catch(() => ({}))) as {
      playlist?: AdminSpotifyFavoritePlaylist
      error?: string
    }

    if (!response.ok) {
      setStatus(data.error || 'Failed to save Spotify playlist.')
      setCreating(false)
      return
    }

    const nextPlaylist = data.playlist

    if (nextPlaylist) {
      setPlaylists((prev) => {
        const withoutExisting = prev.filter((playlist) => playlist.id !== nextPlaylist.id)
        return [...withoutExisting, nextPlaylist]
      })
    }

    setSpotifyUrl('')
    setSortOrder('100')
    setStatus('Spotify playlist saved and synced from Spotify.')
    setCreating(false)
  }

  async function updateSortOrder(playlistId: string, nextSortOrderValue: string) {
    const nextSortOrder = Number.parseInt(nextSortOrderValue.trim() || '100', 10)

    if (!Number.isFinite(nextSortOrder)) {
      setStatus('Sort order must be a number.')
      return
    }

    setUpdatingId(playlistId)
    setStatus('')

    const response = await fetch(`/api/admin/app-configurations/spotify-favorite-playlists/${playlistId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sortOrder: nextSortOrder }),
    })

    const data = (await response.json().catch(() => ({}))) as {
      playlist?: AdminSpotifyFavoritePlaylist
      error?: string
    }

    if (!response.ok) {
      setStatus(data.error || 'Failed to update playlist sort order.')
      setUpdatingId(null)
      return
    }

    const updatedPlaylist = data.playlist

    if (updatedPlaylist) {
      setPlaylists((prev) => prev.map((playlist) => (playlist.id === playlistId ? updatedPlaylist : playlist)))
    }

    setStatus('Playlist order updated.')
    setUpdatingId(null)
  }

  async function deletePlaylist(playlistId: string) {
    setDeletingId(playlistId)
    setStatus('')

    const response = await fetch(`/api/admin/app-configurations/spotify-favorite-playlists/${playlistId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    const data = (await response.json().catch(() => ({}))) as { error?: string }

    if (!response.ok) {
      setStatus(data.error || 'Failed to remove playlist.')
      setDeletingId(null)
      return
    }

    setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId))
    setStatus('Playlist removed from favorites.')
    setDeletingId(null)
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
        <div className="admin-layout">
          <AdminSubNav />
          <div className="admin-content">
            <PageTitle>App configurations</PageTitle>

            <section
              style={{
                border: '1px solid var(--border-strong)',
                borderRadius: 16,
                padding: 20,
                maxWidth: 980,
                background: 'var(--surface)',
                boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
              }}
            >
              <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Spotify favorites for the utility modal</h2>
                <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                  Add public Spotify playlist links here and the modal&apos;s <strong>Search Our Favorites</strong> tab will populate automatically.
                </p>
                <p style={{ margin: 0, opacity: 0.72, lineHeight: 1.5, fontSize: 14 }}>
                  Most efficient format: <code>{SUGGESTED_LINK_FORMAT}</code>. Query parameters like <code>?si=...</code> are optional and will be ignored.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'minmax(320px, 1fr) 140px auto',
                  alignItems: 'end',
                  marginBottom: 18,
                }}
              >
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Spotify playlist link</span>
                  <input
                    value={spotifyUrl}
                    onChange={(event) => setSpotifyUrl(event.target.value)}
                    placeholder={SUGGESTED_LINK_FORMAT}
                    disabled={creating}
                    style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border-strong)' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Sort order</span>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    disabled={creating}
                    style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border-strong)' }}
                  />
                </label>

                <button
                  type="button"
                  onClick={createPlaylist}
                  disabled={creating}
                  style={{ padding: '12px 16px', height: 46, alignSelf: 'end' }}
                >
                  {creating ? 'Saving…' : 'Add playlist'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: 6, marginBottom: 20, opacity: 0.78, fontSize: 14 }}>
                <div>Only the public playlist link is required.</div>
                <div>
                  Optional metadata worth keeping outside the URL: <strong>sort order</strong> for display order. Everything else shown in the modal is pulled directly from Spotify.
                </div>
              </div>

              {status ? (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(230, 239, 224, 0.7)',
                    border: '1px solid var(--divider-soft)',
                  }}
                >
                  {status}
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => void loadPlaylists()} style={{ padding: '10px 14px' }}>
                  Refresh playlists
                </button>
              </div>

              {loading ? (
                <p>Loading Spotify favorite playlists…</p>
              ) : sortedPlaylists.length === 0 ? (
                <p>No Spotify favorites have been configured yet.</p>
              ) : (
                <>
                  <div className="table-scroll-hint">
                    <span className="table-scroll-hint__icon">↔</span>
                    <span>Swipe to scroll the table</span>
                  </div>
                  <div
                    className="table-scroll table-scroll-indicator"
                    style={{
                      border: '1px solid var(--border-strong)',
                      borderRadius: 12,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      background: 'var(--surface)',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 900,
                        display: 'grid',
                        gridTemplateColumns: '88px minmax(220px, 1.3fr) minmax(160px, 0.9fr) minmax(250px, 1.5fr) 120px 120px',
                      }}
                    >
                      {['Cover', 'Playlist', 'Owner', 'Link', 'Sort', 'Actions'].map((label) => (
                        <div
                          key={label}
                          style={{
                            background: 'var(--primary)',
                            color: 'var(--text-inverse)',
                            padding: 12,
                            fontWeight: 800,
                          }}
                        >
                          {label}
                        </div>
                      ))}

                      {sortedPlaylists.map((playlist) => (
                        <Fragment key={playlist.id}>
                          <div
                            key={`${playlist.id}-cover`}
                            style={{ padding: 12, borderTop: '1px solid var(--divider-soft)', background: 'rgba(230, 239, 224, 0.7)' }}
                          >
                            {playlist.image_url ? (
                              <img
                                src={playlist.image_url}
                                alt=""
                                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', display: 'block' }}
                              />
                            ) : (
                              <div
                                aria-hidden="true"
                                style={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: 12,
                                  display: 'grid',
                                  placeItems: 'center',
                                  background: 'rgba(15, 23, 42, 0.08)',
                                  fontSize: 22,
                                }}
                              >
                                ♫
                              </div>
                            )}
                          </div>
                          <div
                            key={`${playlist.id}-name`}
                            style={{ padding: 12, borderTop: '1px solid var(--divider-soft)', background: 'rgba(230, 239, 224, 0.7)' }}
                          >
                            <div style={{ fontWeight: 800 }}>{playlist.playlist_name}</div>
                            <div style={{ opacity: 0.65, fontSize: 12 }}>Spotify ID: {playlist.spotify_playlist_id}</div>
                          </div>
                          <div
                            key={`${playlist.id}-owner`}
                            style={{ padding: 12, borderTop: '1px solid var(--divider-soft)', background: 'rgba(230, 239, 224, 0.7)' }}
                          >
                            {playlist.owner_name || 'Spotify playlist'}
                          </div>
                          <div
                            key={`${playlist.id}-link`}
                            style={{ padding: 12, borderTop: '1px solid var(--divider-soft)', background: 'rgba(230, 239, 224, 0.7)' }}
                          >
                            <a href={playlist.spotify_url} target="_blank" rel="noreferrer noopener">
                              Open playlist ↗
                            </a>
                          </div>
                          <div
                            key={`${playlist.id}-sort`}
                            style={{ padding: 12, borderTop: '1px solid var(--divider-soft)', background: 'rgba(230, 239, 224, 0.7)' }}
                          >
                            <input
                              type="number"
                              defaultValue={playlist.sort_order}
                              aria-label={`Sort order for ${playlist.playlist_name}`}
                              disabled={updatingId === playlist.id}
                              onBlur={(event) => {
                                const nextValue = event.target.value
                                if (nextValue === String(playlist.sort_order)) {
                                  return
                                }
                                void updateSortOrder(playlist.id, nextValue)
                              }}
                              style={{ width: 80, padding: 10, borderRadius: 10, border: '1px solid var(--border-strong)' }}
                            />
                          </div>
                          <div
                            key={`${playlist.id}-actions`}
                            style={{
                              padding: 12,
                              borderTop: '1px solid var(--divider-soft)',
                              background: 'rgba(230, 239, 224, 0.7)',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => void deletePlaylist(playlist.id)}
                              disabled={deletingId === playlist.id}
                              style={{ padding: '10px 12px' }}
                            >
                              {deletingId === playlist.id ? 'Removing…' : 'Remove'}
                            </button>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
