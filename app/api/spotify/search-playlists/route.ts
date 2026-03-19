import 'server-only'

import { NextResponse } from 'next/server'

type SearchPlaylistsRequestBody = {
  query?: unknown
}

type SpotifyAccessTokenResponse = {
  access_token?: string
}

type SpotifyPlaylistItem = {
  id?: string
  name?: string
  owner?: {
    display_name?: string | null
  } | null
  images?: Array<{
    url?: string
  }> | null
  external_urls?: {
    spotify?: string
  } | null
}

type SpotifySearchResponse = {
  playlists?: {
    items?: Array<SpotifyPlaylistItem | null> | null
  } | null
}

type NormalizedPlaylist = {
  id: string
  name: string
  ownerName: string | null
  imageUrl: string | null
  spotifyUrl: string
}

const SPOTIFY_SEARCH_LIMIT = '6'
const MAX_QUERY_LENGTH = 100

class SpotifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
    readonly publicMessage: string = 'Unable to search Spotify playlists right now.'
  ) {
    super(message)
    this.name = 'SpotifyApiError'
  }
}

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim()
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new SpotifyApiError(
      'Missing Spotify client credentials.',
      503,
      'Spotify playlist search is not configured right now.'
    )
  }

  return { clientId, clientSecret }
}

async function getSpotifyAccessToken() {
  const { clientId, clientSecret } = getSpotifyCredentials()
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }).toString(),
    cache: 'no-store',
  })

  if (response.status === 429) {
    throw new SpotifyApiError(
      'Spotify rate limited the token request.',
      429,
      'Spotify is rate limiting requests right now. Please wait a moment and try again.'
    )
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new SpotifyApiError(
      `Spotify token request failed with ${response.status}: ${errorBody}`,
      502,
      'Unable to connect to Spotify right now. Please try again in a moment.'
    )
  }

  const data = (await response.json()) as SpotifyAccessTokenResponse

  if (!data.access_token) {
    throw new SpotifyApiError(
      'Spotify token response did not include an access token.',
      502,
      'Unable to connect to Spotify right now. Please try again in a moment.'
    )
  }

  return data.access_token
}

function normalizePlaylist(playlist: SpotifyPlaylistItem | null): NormalizedPlaylist | null {
  if (!playlist) {
    return null
  }

  const id = typeof playlist.id === 'string' ? playlist.id : ''
  const name = typeof playlist.name === 'string' ? playlist.name : ''
  const spotifyUrl = typeof playlist.external_urls?.spotify === 'string' ? playlist.external_urls.spotify : ''

  if (!id || !name || !spotifyUrl) {
    return null
  }

  const imageUrl = typeof playlist.images?.[0]?.url === 'string' ? playlist.images[0].url : null
  const ownerName = typeof playlist.owner?.display_name === 'string' ? playlist.owner.display_name : null

  return {
    id,
    name,
    ownerName,
    imageUrl,
    spotifyUrl,
  }
}

async function searchSpotifyPlaylists(query: string) {
  const accessToken = await getSpotifyAccessToken()
  const searchUrl = new URL('https://api.spotify.com/v1/search')

  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('type', 'playlist')
  searchUrl.searchParams.set('limit', SPOTIFY_SEARCH_LIMIT)

  const response = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (response.status === 429) {
    throw new SpotifyApiError(
      'Spotify rate limited the playlist search request.',
      429,
      'Spotify is rate limiting playlist searches right now. Please wait a moment and try again.'
    )
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new SpotifyApiError(
      `Spotify search request failed with ${response.status}: ${errorBody}`,
      502,
      'Unable to search Spotify right now. Please try again in a moment.'
    )
  }

  const data = (await response.json()) as SpotifySearchResponse
  const items = Array.isArray(data.playlists?.items) ? data.playlists.items : []
  const playlists = items.map(normalizePlaylist).filter((playlist): playlist is NormalizedPlaylist => playlist !== null)

  if (playlists.length !== items.length) {
    console.warn('Spotify search returned playlist entries missing required fields.', {
      returnedItems: items.length,
      normalizedItems: playlists.length,
      droppedItems: items.length - playlists.length,
      query,
    })
  }

  return playlists
}

export async function POST(request: Request) {
  let body: SearchPlaylistsRequestBody

  try {
    body = (await request.json()) as SearchPlaylistsRequestBody
  } catch (error) {
    console.error('Invalid JSON body for Spotify playlist search.', error)
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.trim() : ''

  if (!query) {
    return NextResponse.json({ error: 'Enter a search term to find Spotify playlists.' }, { status: 400 })
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Search terms must be ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400 }
    )
  }

  try {
    const playlists = await searchSpotifyPlaylists(query)
    return NextResponse.json({ playlists })
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      if (error.status >= 500) {
        console.error('Spotify playlist search failed.', error)
      }

      return NextResponse.json({ error: error.publicMessage }, { status: error.status })
    }

    console.error('Spotify playlist search failed.', error)
    return NextResponse.json(
      { error: 'Unable to search Spotify playlists right now. Please try again later.' },
      { status: 500 }
    )
  }
}
