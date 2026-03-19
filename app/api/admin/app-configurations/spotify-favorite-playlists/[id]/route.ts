import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

type UpdateFavoritePlaylistRequest = {
  sortOrder?: number
}

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request)

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }

  const { id } = await context.params
  const body = (await request.json().catch(() => null)) as UpdateFavoritePlaylistRequest | null
  const sortOrder = typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder) ? body.sortOrder : null

  if (!id) {
    return NextResponse.json({ error: 'Playlist id is required.' }, { status: 400 })
  }

  if (sortOrder === null) {
    return NextResponse.json({ error: 'sortOrder must be a number.' }, { status: 400 })
  }

  const result = await supabaseServer
    .from('spotify_favorite_playlists')
    .update({ sort_order: sortOrder })
    .eq('id', id)
    .select('id, spotify_playlist_id, playlist_name, owner_name, image_url, spotify_url, sort_order, created_at, updated_at')
    .single()

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ playlist: result.data })
}

export async function DELETE(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request)

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'Playlist id is required.' }, { status: 400 })
  }

  const result = await supabaseServer.from('spotify_favorite_playlists').delete().eq('id', id)

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
