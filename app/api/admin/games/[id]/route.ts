import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const id = params?.id

  if (!id) {
    return NextResponse.json({ error: 'Missing game id' }, { status: 400 })
  }

  // Delete join rows first to avoid FK constraint issues (unless you have ON DELETE CASCADE)
  const delJoin = await supabaseServer.from('game_tags').delete().eq('game_id', id)
  if (delJoin.error) {
    return NextResponse.json({ error: delJoin.error.message }, { status: 500 })
  }

  const delGame = await supabaseServer.from('games').delete().eq('id', id)
  if (delGame.error) {
    return NextResponse.json({ error: delGame.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

