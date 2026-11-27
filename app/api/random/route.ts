import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function logGameSuggestion(tournamentId: string, gameId: string) {
  const { error } = await supabaseServer.from('game_suggestion_events').insert({
    tournament_id: tournamentId,
    game_id: gameId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const t = await supabaseServer
    .from('tournaments')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (t.error) return NextResponse.json({ error: t.error.message }, { status: 500 })
  if (!t.data?.id) return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })

  const tournamentId = t.data.id as string

  // Older clients send a single tag or use maxPlayers for the group size.
  const tagsParam = searchParams.get('tags')?.trim() || ''
  const legacyTag = searchParams.get('tag')?.trim() || ''

  const tagSlugs =
    tagsParam.length > 0
      ? tagsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : legacyTag
        ? [legacyTag]
        : []

  const countInput = (searchParams.get('playerCount') ?? searchParams.get('maxPlayers'))?.trim()
  const playerCount = countInput ? Number(countInput) : null
  if (playerCount !== null && (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 2147483647)) {
    return NextResponse.json({ message: 'Enter a positive whole number of players.' }, { status: 400 })
  }

  const { data: game, error } = await supabaseServer.rpc('pick_random_game', {
    p_tournament_id: tournamentId,
    p_tags: tagSlugs,
    p_player_count: playerCount,
  }).maybeSingle<{ id: string }>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!game) {
    return NextResponse.json(
      { message: 'No unplayed game in the active tournament matches your filters.' },
      { status: 404 }
    )
  }

  try {
    await logGameSuggestion(tournamentId, game.id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log game suggestion.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ game, tournamentId })
}
