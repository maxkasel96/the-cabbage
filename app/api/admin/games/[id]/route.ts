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
  const isActive = body?.is_active
  const hasMinPlayers = Object.prototype.hasOwnProperty.call(body ?? {}, 'min_players')
  const hasMaxPlayers = Object.prototype.hasOwnProperty.call(body ?? {}, 'max_players')
  const hasIsActive = Object.prototype.hasOwnProperty.call(body ?? {}, 'is_active')

  const update: Record<string, number | boolean | null> = {}

  if (hasMinPlayers) {
    update.min_players = typeof minPlayers === 'number' ? minPlayers : null
  }
  if (hasMaxPlayers) {
    update.max_players = typeof maxPlayers === 'number' ? maxPlayers : null
  }
  if (hasIsActive && typeof isActive === 'boolean') {
    update.is_active = isActive
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 })
  }

  if (
    typeof update.min_players === 'number' &&
    typeof update.max_players === 'number' &&
    update.min_players > update.max_players
  ) {
    return NextResponse.json({ error: 'min_players must be <= max_players' }, { status: 400 })
  }

  const result = await supabaseServer
    .from('games')
    .update(update)
    .eq('id', id)
    .select('id, min_players, max_players, is_active')
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
