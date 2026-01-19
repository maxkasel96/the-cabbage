import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'Missing game id' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const minPlayers = body?.min_players
  const maxPlayers = body?.max_players

  const update = {
    min_players: typeof minPlayers === 'number' ? minPlayers : null,
    max_players: typeof maxPlayers === 'number' ? maxPlayers : null,
  }

  if (
    update.min_players !== null &&
    update.max_players !== null &&
    update.min_players > update.max_players
  ) {
    return NextResponse.json({ error: 'min_players must be <= max_players' }, { status: 400 })
  }

  const result = await supabaseServer
    .from('games')
    .update(update)
    .eq('id', id)
    .select('id, min_players, max_players')
    .single()

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ game: result.data })
}

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

