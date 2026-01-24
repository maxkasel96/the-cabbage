import { NextResponse } from 'next/server'

import { getActiveTournamentId } from '@/lib/getActiveTournamentId'
import { supabaseServer } from '@/lib/supabaseServer'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const playerId = (body?.playerId as string | undefined)?.trim() ?? ''

  if (!playerId || !uuidRegex.test(playerId)) {
    return NextResponse.json({ error: 'Invalid playerId.' }, { status: 400 })
  }

  const tournamentId = await getActiveTournamentId()
  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('player_selection_events').insert({
    tournament_id: tournamentId,
    player_id: playerId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
