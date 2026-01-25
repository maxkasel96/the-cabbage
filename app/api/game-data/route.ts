import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { getActiveTournamentId } from '@/lib/getActiveTournamentId'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  let tournamentId: string | null

  try {
    tournamentId = await getActiveTournamentId()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load active tournament.' },
      { status: 500 }
    )
  }

  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  const { data: games, error: gamesError } = await supabaseServer
    .from('games')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 })
  }

  const { data: suggestionCounts, error: suggestionError } = await supabaseServer
    .from('game_suggestion_counts')
    .select('game_id, suggestion_count')
    .eq('tournament_id', tournamentId)

  if (suggestionError) {
    return NextResponse.json({ error: suggestionError.message }, { status: 500 })
  }

  const { data: playedRows, error: playedError } = await supabaseServer
    .from('plays')
    .select('game_id')
    .eq('tournament_id', tournamentId)
    .not('played_at', 'is', null)

  if (playedError) {
    return NextResponse.json({ error: playedError.message }, { status: 500 })
  }

  const suggestionMap = new Map<string, number>()
  for (const row of suggestionCounts ?? []) {
    if (row.game_id) {
      suggestionMap.set(row.game_id as string, Number(row.suggestion_count ?? 0))
    }
  }

  const playedSet = new Set<string>((playedRows ?? []).map((row) => row.game_id as string))

  const rows = (games ?? []).map((game) => ({
    id: game.id as string,
    name: game.name as string,
    suggestionCount: suggestionMap.get(game.id as string) ?? 0,
    played: playedSet.has(game.id as string),
  }))

  return NextResponse.json({ tournamentId, rows })
}
