import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('games')
    .select(
      `
      id,
      name,
      played_at,
      winner_player_id,
      players:winner_player_id (
        id,
        display_name
      )
    `
    )
    .not('played_at', 'is', null)
    .order('played_at', { ascending: false })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    played_at: g.played_at,
    winner: g.players ? { id: g.players.id, display_name: g.players.display_name } : null,
  }))

  return NextResponse.json({ history })
}
