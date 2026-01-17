import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PUT(
  req: Request,
  context: { params: { gameId: string } }
) {
  const { gameId } = context.params

  // Validate gameId (prevents "undefined" or malformed UUIDs from hitting Postgres)
  if (!uuidRegex.test(gameId)) {
    return NextResponse.json({ error: `Invalid gameId: ${gameId}` }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const tagIdsRaw = body?.tagIds

  // Validate presence & type
  if (!Array.isArray(tagIdsRaw)) {
    return NextResponse.json({ error: 'tagIds (string[]) is required' }, { status: 400 })
  }

  // Filter to valid UUID strings only (drops undefined/null/"undefined"/malformed)
  const tagIds = tagIdsRaw.filter(
    (t: unknown): t is string => typeof t === 'string' && uuidRegex.test(t)
  )

  // If the client sent tagIds but none are valid UUIDs, make it obvious
  if (tagIdsRaw.length > 0 && tagIds.length === 0) {
    return NextResponse.json(
      { error: `No valid tagIds provided. Received: ${JSON.stringify(tagIdsRaw)}` },
      { status: 400 }
    )
  }

  // 1) Remove existing tag links for this game
  const del = await supabaseServer.from('game_tags').delete().eq('game_id', gameId)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  // 2) Insert new links (if any)
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ game_id: gameId, tag_id: tagId }))
    const ins = await supabaseServer.from('game_tags').insert(rows)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

