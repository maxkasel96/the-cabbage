import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const gameIds = Array.isArray(body?.gameIds) ? body.gameIds : []
  const tagId = typeof body?.tagId === 'string' ? body.tagId : ''

  const cleanGameIds = gameIds.filter((id: unknown) => typeof id === 'string' && id.length > 0)

  if (!tagId) return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
  if (cleanGameIds.length === 0) return NextResponse.json({ error: 'gameIds is required' }, { status: 400 })

  // Build join rows
  const rows = cleanGameIds.map((game_id: string) => ({ game_id, tag_id: tagId }))

  // If you have a unique constraint on (game_id, tag_id), upsert prevents duplicates.
  // If you do NOT have that constraint, add it in DB for best results.
  const ins = await supabaseServer.from('game_tags').upsert(rows, { onConflict: 'game_id,tag_id' })

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, added: cleanGameIds.length })
}
