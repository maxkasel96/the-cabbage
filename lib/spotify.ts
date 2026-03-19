export type PlaylistSuggestion = {
  id: string
  name: string
  ownerName: string | null
  imageUrl: string | null
  spotifyUrl: string
}

type SpotifyAccessTokenResponse = {
  access_token?: string
}

type SpotifyPlaylistItem = {
  id?: string
  name?: string
  images?: Array<{ url?: string | null } | null> | null
  owner?: {
    display_name?: string | null
  } | null
  external_urls?: {
    spotify?: string
  } | null
}

type SpotifySearchResponse = {
  playlists?: {
    items?: Array<SpotifyPlaylistItem | null>
  } | null
}

const SPOTIFY_PLAYLIST_ID_PATTERN = /^[A-Za-z0-9]{22}$/

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
    readonly publicMessage: string = 'Unable to reach Spotify right now.'
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
      500,
      'Spotify integration is not configured right now.'
    )
  }

  return { clientId, clientSecret }
}

async function parseSpotifyJson<T>(response: Response, context: string): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new SpotifyApiError(
      `${context} returned invalid JSON.`,
      502,
      'Received an invalid response from Spotify. Please try again in a moment.'
    )
  }
}

async function getSpotifyAccessToken() {
  const { clientId, clientSecret } = getSpotifyCredentials()
  const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  let response: Response

  try {
    response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      cache: 'no-store',
    })
  } catch (error) {
    throw new SpotifyApiError(
      `Spotify token request could not be completed: ${error instanceof Error ? error.message : String(error)}`,
      502,
      'Unable to reach Spotify right now. Please try again in a moment.'
    )
  }

  if (response.status === 429) {
    throw new SpotifyApiError(
      'Spotify rate limited the token request.',
      429,
      'Spotify is receiving a lot of traffic right now. Please wait a moment and try again.'
    )
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new SpotifyApiError(
      `Spotify token request failed with ${response.status}: ${errorBody}`,
      502,
      'Unable to connect to Spotify right now. Please try again in a moment.'
    )
  }

  const data = await parseSpotifyJson<SpotifyAccessTokenResponse>(response, 'Spotify token request')

  if (!data.access_token) {
    throw new SpotifyApiError(
      'Spotify token response did not include an access token.',
      502,
      'Unable to connect to Spotify right now. Please try again in a moment.'
    )
  }

  return data.access_token
}

function normalizePlaylist(playlist: SpotifyPlaylistItem | null | undefined): PlaylistSuggestion | null {
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

export function extractSpotifyPlaylistId(input: string) {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  if (SPOTIFY_PLAYLIST_ID_PATTERN.test(trimmed)) {
    return trimmed
  }

  const colonMatch = trimmed.match(/spotify:playlist:([A-Za-z0-9]{22})/i)
  if (colonMatch?.[1]) {
    return colonMatch[1]
  }

  try {
    const url = new URL(trimmed)
    const pathMatch = url.pathname.match(/\/playlist\/([A-Za-z0-9]{22})/i)
    if (pathMatch?.[1]) {
      return pathMatch[1]
    }
  } catch {
    return null
  }

  return null
}

export async function searchSpotifyPlaylists(query: string) {
  const accessToken = await getSpotifyAccessToken()
  const searchUrl = new URL('https://api.spotify.com/v1/search')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('type', 'playlist')
  searchUrl.searchParams.set('limit', '12')
  searchUrl.searchParams.set('market', 'US')

  let response: Response

  try {
    response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
  } catch (error) {
    throw new SpotifyApiError(
      `Spotify search request could not be completed: ${error instanceof Error ? error.message : String(error)}`,
      502,
      'Unable to reach Spotify right now. Please try again in a moment.'
    )
  }

  if (response.status === 429) {
    throw new SpotifyApiError(
      'Spotify rate limited the playlist search request.',
      429,
      'Spotify is receiving a lot of traffic right now. Please wait a moment and try again.'
    )
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new SpotifyApiError(
      `Spotify search request failed with ${response.status}: ${errorBody}`,
      502,
      'Unable to search Spotify right now. Please try again in a moment.'
    )
  }

  const data = await parseSpotifyJson<SpotifySearchResponse>(response, 'Spotify playlist search')
  const items = Array.isArray(data.playlists?.items) ? data.playlists.items : []

  return items.map(normalizePlaylist).filter((playlist): playlist is PlaylistSuggestion => playlist !== null)
}

export async function getSpotifyPlaylistById(playlistId: string) {
  const accessToken = await getSpotifyAccessToken()
  const playlistUrl = new URL(`https://api.spotify.com/v1/playlists/${playlistId}`)
  playlistUrl.searchParams.set('fields', 'id,name,images,owner(display_name),external_urls(spotify)')
  playlistUrl.searchParams.set('market', 'US')

  let response: Response

  try {
    response = await fetch(playlistUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
  } catch (error) {
    throw new SpotifyApiError(
      `Spotify playlist request could not be completed: ${error instanceof Error ? error.message : String(error)}`,
      502,
      'Unable to reach Spotify right now. Please try again in a moment.'
    )
  }

  if (response.status === 404) {
    throw new SpotifyApiError(
      `Spotify playlist ${playlistId} was not found.`,
      404,
      'That Spotify playlist could not be found. Please double-check the link.'
    )
  }

  if (response.status === 429) {
    throw new SpotifyApiError(
      'Spotify rate limited the playlist detail request.',
      429,
      'Spotify is receiving a lot of traffic right now. Please wait a moment and try again.'
    )
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new SpotifyApiError(
      `Spotify playlist request failed with ${response.status}: ${errorBody}`,
      502,
      'Unable to verify that Spotify playlist right now. Please try again in a moment.'
    )
  }

  const data = await parseSpotifyJson<SpotifyPlaylistItem>(response, 'Spotify playlist request')
  const playlist = normalizePlaylist(data)

  if (!playlist) {
    throw new SpotifyApiError(
      `Spotify playlist ${playlistId} response did not include the required fields.`,
      502,
      'Spotify did not return enough information for that playlist. Please try a different link.'
    )
  }

  return playlist
}
