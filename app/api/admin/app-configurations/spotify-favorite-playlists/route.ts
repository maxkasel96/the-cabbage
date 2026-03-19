import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { supabaseServer } from '@/lib/supabaseServer'
import { extractSpotifyPlaylistId, getSpotifyPlaylistById, SpotifyApiError } from '@/lib/spotify'

export const runtime = 'nodejs'

type CreateFavoritePlaylistRequest = {
  spotifyUrl?: string
  sortOrder?: number
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request)

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }

  const { data, error } = await supabaseServer
    .from('spotify_favorite_playlists')
    .select('id, spotify_playlist_id, playlist_name, owner_name, image_url, spotify_url, sort_order, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('playlist_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ playlists: data ?? [] })
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request)

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }

  const body = (await request.json().catch(() => null)) as CreateFavoritePlaylistRequest | null
  const spotifyUrl = typeof body?.spotifyUrl === 'string' ? body.spotifyUrl.trim() : ''
  const sortOrder = typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder) ? body.sortOrder : 100

  if (!spotifyUrl) {
    return NextResponse.json({ error: 'Spotify playlist link is required.' }, { status: 400 })
  }

  const playlistId = extractSpotifyPlaylistId(spotifyUrl)

  if (!playlistId) {
    return NextResponse.json(
      { error: 'Enter a valid Spotify playlist link in the form https://open.spotify.com/playlist/{playlistId}.' },
      { status: 400 }
    )
  }

  try {
    const playlist = await getSpotifyPlaylistById(playlistId)

    const result = await supabaseServer
      .from('spotify_favorite_playlists')
      .upsert(
        {
          spotify_playlist_id: playlist.id,
          playlist_name: playlist.name,
          owner_name: playlist.ownerName,
          image_url: playlist.imageUrl,
          spotify_url: playlist.spotifyUrl,
          sort_order: sortOrder,
        },
        {
          onConflict: 'spotify_playlist_id',
        }
      )
      .select('id, spotify_playlist_id, playlist_name, owner_name, image_url, spotify_url, sort_order, created_at, updated_at')
      .single()

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ playlist: result.data }, { status: 201 })
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      if (error.status >= 500 || error.status === 429) {
        console.error('Spotify favorite playlist validation failed.', error)
      }

      return NextResponse.json({ error: error.publicMessage }, { status: error.status })
    }

    console.error('Spotify favorite playlist validation failed.', error)
    return NextResponse.json({ error: 'Unable to save that Spotify playlist right now.' }, { status: 500 })
  }
}
