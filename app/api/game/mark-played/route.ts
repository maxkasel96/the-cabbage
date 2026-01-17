import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const gameId = body?.gameId as string | undefined

  // Accept either winnerPlayerIds (new) or winnerPlayerId (old) for backward compatibility
  const winnerPlayerIdsRaw =
    (body?.winnerPlayerIds as unknown) ??
    (body?.winnerPlayerId ? [body.winnerPlayerId] : [])

  if (!gameId || !uuidRegex.test(gameId)) {
    return NextResponse.json({ error: `Invalid gameId: ${gameId}` }, { status: 400 })
  }

  if (!Array.isArray(winnerPlayerIdsRaw)) {
    return NextResponse.json({ error: 'winnerPlayerIds must be an array' }, { status: 400 })
  }

  // Clean: keep only valid UUID strings, remove duplicates
  const winnerPlayerIds = Array.from(
    new Set(
      winnerPlayerIdsRaw
        .filter((x: unknown): x is string => typeof x === 'string' && uuidRegex.test(x))
    )
  )

  // 1) Mark game as played (timestamp)
  const upd = await supabaseServer
    .from('games')
    .update({ played_at: new Date().toISOString() })
    .eq('id', gameId)

  if (upd.error) {
    return NextResponse.json({ error: upd.error.message }, { status: 500 })
  }

  // 2) Replace winners (simple and consistent)
  const del = await supabaseServer
    .from('game_winners')
    .delete()
    .eq('game_id', gameId)

  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 })
  }

  // 3) Insert new winners (0+)
  if (winnerPlayerIds.length > 0) {
    const rows = winnerPlayerIds.map((playerId) => ({
      game_id: gameId,
      player_id: playerId,
    }))

    const ins = await supabaseServer.from('game_winners').insert(rows)

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, gameId, winnerPlayerIds })
}
