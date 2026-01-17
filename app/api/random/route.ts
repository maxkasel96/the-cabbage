import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')?.trim() || null

  // If no tag: pull unplayed active games
  if (!tag) {
    const { data, error } = await supabaseServer
      .from('games')
      .select('id, name, min_players, max_players, playtime_minutes, notes, played_at, winner_player_id')
      .is('played_at', null)
      .eq('is_active', true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No unplayed games found.' }, { status: 404 })
    }

    const game = data[Math.floor(Math.random() * data.length)]
    return NextResponse.json({ game })
  }

  // With tag: join through game_tags -> tags, and only return games that have that tag
  const { data, error } = await supabaseServer
    .from('games')
    .select(
      `
      id, name, min_players, max_players, playtime_minutes, notes, played_at, winner_player_id,
      game_tags!inner(
        tags!inner(slug)
      )
      `
    )
    .is('played_at', null)
    .eq('is_active', true)
    .eq('game_tags.tags.slug', tag)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json(
      { message: `No unplayed games found for tag: ${tag}` },
      { status: 404 }
    )
  }

  const game = data[Math.floor(Math.random() * data.length)]
  return NextResponse.json({ game })
}

