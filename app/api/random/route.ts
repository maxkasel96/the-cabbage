import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('games')
    .select('id, name, min_players, max_players, playtime_minutes, notes, played_at, winner_player_id')
    .is('played_at', null)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ message: 'No unplayed games found.' }, { status: 404 })
  }

  const game = data[Math.floor(Math.random() * data.length)]
  return NextResponse.json({ game })
}
