import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const gameId = body?.gameId as string | undefined
  const winnerPlayerId = (body?.winnerPlayerId as string | null | undefined) ?? null

  if (!gameId) {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('games')
    .update({
      played_at: new Date().toISOString(),
      winner_player_id: winnerPlayerId,
    })
    .eq('id', gameId)
    .select('id, name, played_at, winner_player_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ game: data })
}
