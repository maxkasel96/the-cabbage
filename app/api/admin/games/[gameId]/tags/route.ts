import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function PUT(
  req: Request,
  context: { params: { gameId: string } }
) {
  const { gameId } = context.params
  const body = await req.json().catch(() => null)
  const tagIds = (body?.tagIds as string[] | undefined) ?? null

  if (!tagIds || !Array.isArray(tagIds)) {
    return NextResponse.json({ error: 'tagIds (string[]) is required' }, { status: 400 })
  }

  // 1) Remove existing tag links for this game
  const del = await supabaseServer
    .from('game_tags')
    .delete()
    .eq('game_id', gameId)

  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  // 2) Insert new links (if any)
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ game_id: gameId, tag_id: tagId }))
    const ins = await supabaseServer.from('game_tags').insert(rows)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
