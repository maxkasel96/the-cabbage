import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  console.log('DELETE /api/admin/games/:id', { id, url: req.url })

  if (!id) {
    return NextResponse.json({ error: 'Missing game id' }, { status: 400 })
  }

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


