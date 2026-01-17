import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function extractGameIdFromPath(pathname: string) {
  // pathname: /api/admin/games/<gameId>/tags
  const parts = pathname.split('/').filter(Boolean)
  const gamesIdx = parts.indexOf('games')
  if (gamesIdx === -1) return null
  return parts[gamesIdx + 1] ?? null
}

export async function PUT(req: Request) {
  const url = new URL(req.url)
  const gameId = extractGameIdFromPath(url.pathname)

  if (!gameId) {
    return NextResponse.json(
      { error: `Missing gameId in URL path: ${url.pathname}` },
      { status: 400 }
    )
  }

  if (!uuidRegex.test(gameId)) {
    return NextResponse.json({ error: `Invalid gameId: ${gameId}` }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const tagIdsRaw = body?.tagIds

  if (!Array.isArray(tagIdsRaw)) {
    return NextResponse.json({ error: 'tagIds (string[]) is required' }, { status: 400 })
  }

  const tagIds = tagIdsRaw.filter(
    (t: unknown): t is string => typeof t === 'string' && uuidRegex.test(t)
  )

  if (tagIdsRaw.length > 0 && tagIds.length === 0) {
    return NextResponse.json(
      { error: `No valid tagIds provided. Received: ${JSON.stringify(tagIdsRaw)}` },
      { status: 400 }
    )
  }

  const del = await supabaseServer.from('game_tags').delete().eq('game_id', gameId)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ game_id: gameId, tag_id: tagId }))
    const ins = await supabaseServer.from('game_tags').insert(rows)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

