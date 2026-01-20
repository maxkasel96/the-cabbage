import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  params: Promise<{ playerId: string }>
}

export async function GET(_: NextRequest, { params }: Params) {
  const { playerId } = await params
  const { data, error } = await supabaseServer
    .from('players')
    .select('id, display_name, is_active')
    .eq('id', playerId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  return NextResponse.json({ player: data })
}
