import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { getActiveTournamentId } from '@/lib/getActiveTournamentId'

export async function GET() {
  const tournamentId = await getActiveTournamentId()
  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('plays')
    .select(
      `
      id,
      played_at,
      games ( id, name ),
      game_winners (
        players ( id, display_name )
      )
    `
    )
    .eq('tournament_id', tournamentId)
    .order('played_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = (data ?? []).map((p: any) => {
    const winners =
      (p.game_winners ?? [])
        .map((gw: any) => gw.players)
        .filter(Boolean)
        .reduce((acc: any[], pl: any) => {
          if (!acc.some((x) => x.id === pl.id)) acc.push(pl)
          return acc
        }, [])

    return {
      id: p.games?.id,
      name: p.games?.name,
      played_at: p.played_at,
      winners,
    }
  })

  return NextResponse.json({ history, tournamentId })
}


