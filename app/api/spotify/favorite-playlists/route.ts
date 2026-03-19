import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('spotify_favorite_playlists')
    .select('id, playlist_name, owner_name, image_url, spotify_url, sort_order')
    .order('sort_order', { ascending: true })
    .order('playlist_name', { ascending: true })

  if (error) {
    console.error('Failed to load Spotify favorite playlists.', error)
    return NextResponse.json({ error: 'Unable to load favorite Spotify playlists right now.' }, { status: 500 })
  }

  const playlists = (data ?? []).map((playlist) => ({
    id: playlist.id,
    name: playlist.playlist_name,
    ownerName: playlist.owner_name,
    imageUrl: playlist.image_url,
    spotifyUrl: playlist.spotify_url,
    sortOrder: playlist.sort_order,
  }))

  return NextResponse.json({ playlists })
}
