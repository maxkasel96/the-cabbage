import 'server-only'

import { NextResponse } from 'next/server'

type SearchPlaylistsRequestBody = {
  query?: unknown
  testMode?: unknown
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
    items?: SpotifyPlaylistItem[]
  }
}

type NormalizedPlaylist = {
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
      authorization: 'Basic <base64(client_id:client_secret)>'
      contentType: 'application/x-www-form-urlencoded'
    }
    body: 'grant_type=client_credentials'
  }
  searchRequest: {
    url: string
    method: 'GET'
    headers: {
      authorization: 'Bearer <spotify_access_token>'
    }
    queryParams: {
      q: string
      type: 'playlist'
      limit: '6'
    }
  }
}

class SpotifyApiError extends Error {
  constructor(
    readonly kind: 'token' | 'search',
    message: string
  ) {
    super(message)
    this.name = 'SpotifyApiError'
  }
}

function buildSpotifyRequestPreview(query: string): SpotifyRequestPreview {
  const searchUrl = new URL('https://api.spotify.com/v1/search')

  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('type', 'playlist')
  searchUrl.searchParams.set('limit', '6')

  return {
    mode: 'test',
    query,
    hasClientId: Boolean(process.env.SPOTIFY_CLIENT_ID?.trim()),
    hasClientSecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET?.trim()),
    tokenRequest: {
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: {
        authorization: 'Basic <base64(client_id:client_secret)>',
        contentType: 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    },
    searchRequest: {
      url: searchUrl.toString(),
      method: 'GET',
      headers: {
        authorization: 'Bearer <spotify_access_token>',
      },
      queryParams: {
        q: query,
        type: 'playlist',
        limit: '6',
      },
    },
  }
}

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim()
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new SpotifyApiError('token', 'Missing Spotify client credentials.')
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

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new SpotifyApiError(
      'token',
      `Spotify token request failed with ${response.status}: ${errorBody}`
    )
  }

  const data = (await response.json()) as SpotifyAccessTokenResponse

  if (!data.access_token) {
    throw new SpotifyApiError('token', 'Spotify token response did not include an access token.')
  }

  return data.access_token
}

function normalizePlaylist(playlist: SpotifyPlaylistItem): NormalizedPlaylist | null {
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
  searchUrl.searchParams.set('limit', '6')

  const response = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new SpotifyApiError(
      'search',
      `Spotify search request failed with ${response.status}: ${errorBody}`
    )
  }

  const data = (await response.json()) as SpotifySearchResponse
  const items = Array.isArray(data.playlists?.items) ? data.playlists.items : []

  return items.map(normalizePlaylist).filter((playlist): playlist is NormalizedPlaylist => playlist !== null)
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
  const testMode = body.testMode === true

  if (!query) {
    return NextResponse.json({ error: 'query must be a non-empty string.' }, { status: 400 })
  }

  if (testMode) {
    return NextResponse.json({
      playlists: [],
      test: buildSpotifyRequestPreview(query),
    })
  }

  try {
    const playlists = await searchSpotifyPlaylists(query)
    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Spotify playlist search failed.', error)

    if (error instanceof SpotifyApiError) {
      return NextResponse.json(
        {
          error:
            error.kind === 'token'
              ? 'Failed to fetch Spotify access token.'
              : 'Failed to search Spotify playlists.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: 'Failed to search Spotify playlists.' }, { status: 500 })
  }
}
