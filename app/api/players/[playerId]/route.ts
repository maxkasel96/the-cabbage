import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  params: Promise<{ playerId: string }>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_: NextRequest, { params }: Params) {
  const { playerId } = await params
  if (!uuidPattern.test(playerId)) {
    return NextResponse.json({ error: 'Invalid player id.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('players')
    .select('id, display_name, is_active, avatar_path, card_path, player_bio')
    .eq('id', playerId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  return NextResponse.json({ player: data })
}
