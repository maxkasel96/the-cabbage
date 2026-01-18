import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { getActiveTournamentId } from '@/lib/getActiveTournamentId'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const gameId = body?.gameId as string | undefined
  const winnerPlayerIdsRaw =
    (body?.winnerPlayerIds as unknown) ??
    (body?.winnerPlayerId ? [body.winnerPlayerId] : [])

  if (!gameId || !uuidRegex.test(gameId)) {
    return NextResponse.json({ error: `Invalid gameId: ${gameId}` }, { status: 400 })
  }

  if (!Array.isArray(winnerPlayerIdsRaw)) {
    return NextResponse.json({ error: 'winnerPlayerIds must be an array' }, { status: 400 })
  }

  const winnerPlayerIds = Array.from(
    new Set(winnerPlayerIdsRaw.filter((x: unknown): x is string => typeof x === 'string' && uuidRegex.test(x)))
  )

  const tournamentId = await getActiveTournamentId()
  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  // 1) Create (or re-use) play record for this game in this tournament
  // If you want to allow playing the same game multiple times in a tournament,
  // remove the unique index and use insert(). For now we keep one play per game.
  const playUpsert = await supabaseServer
    .from('plays')
    .upsert(
      [{ tournament_id: tournamentId, game_id: gameId }],
      { onConflict: 'tournament_id,game_id' }
    )
    .select('id')
    .single()

  if (playUpsert.error) {
    return NextResponse.json({ error: playUpsert.error.message }, { status: 500 })
  }

  const playId = playUpsert.data.id as string

  // 2) Replace winners for this play (delete then insert)
  const del = await supabaseServer.from('game_winners').delete().eq('play_id', playId)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  if (winnerPlayerIds.length > 0) {
    const rows = winnerPlayerIds.map((playerId) => ({ play_id: playId, player_id: playerId }))
    const ins = await supabaseServer.from('game_winners').insert(rows)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tournamentId, gameId, playId, winnerPlayerIds })
}

