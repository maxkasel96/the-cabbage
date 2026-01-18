import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const tagsParam = searchParams.get('tags')?.trim() || ''
  const legacyTag = searchParams.get('tag')?.trim() || ''

  const tagSlugs =
    tagsParam.length > 0
      ? tagsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : legacyTag
        ? [legacyTag]
        : []

  // No tags selected
  if (tagSlugs.length === 0) {
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

  // Tags selected (OR semantics)
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
    .in('game_tags.tags.slug', tagSlugs)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json(
      { message: `No unplayed games found for tags: ${tagSlugs.join(', ')}` },
      { status: 404 }
    )
  }

  const game = data[Math.floor(Math.random() * data.length)]
  return NextResponse.json({ game })
}


