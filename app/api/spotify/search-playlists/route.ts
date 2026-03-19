import 'server-only'

import { NextResponse } from 'next/server'
import { searchSpotifyPlaylists, SpotifyApiError } from '@/lib/spotify'

export const runtime = 'nodejs'

type SearchPlaylistsRequestBody = {
  query?: string
}

const MAX_QUERY_LENGTH = 100

export async function POST(request: Request) {
  let body: SearchPlaylistsRequestBody

  try {
    body = (await request.json()) as SearchPlaylistsRequestBody
  } catch (error) {
    console.error('Invalid JSON body for Spotify playlist search.', error)
    return NextResponse.json({ error: 'Enter a valid search term to find Spotify playlists.' }, { status: 400 })
  }

  if (typeof body.query !== 'string') {
    return NextResponse.json({ error: 'Enter a search term to find Spotify playlists.' }, { status: 400 })
  }

  const query = body.query.trim().slice(0, MAX_QUERY_LENGTH)

  if (!query) {
    return NextResponse.json({ error: 'Enter a search term to find Spotify playlists.' }, { status: 400 })
  }

  try {
    const playlists = await searchSpotifyPlaylists(query)
    return NextResponse.json({ playlists })
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      if (error.status >= 500 || error.status === 429) {
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
