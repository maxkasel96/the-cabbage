import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // 1) Resolve active tournament
  const t = await supabaseServer
    .from('tournaments')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (t.error) return NextResponse.json({ error: t.error.message }, { status: 500 })
  if (!t.data?.id) return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })

  const tournamentId = t.data.id as string

  // 2) Parse tags (supports ?tags=a,b and legacy ?tag=a)
  const tagsParam = searchParams.get('tags')?.trim() || ''
  const legacyTag = searchParams.get('tag')?.trim() || ''

  const tagSlugs =
    tagsParam.length > 0
      ? tagsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : legacyTag
        ? [legacyTag]
        : []

  // 3) Get list of played game IDs for this tournament
  const played = await supabaseServer
    .from('plays')
    .select('game_id')
    .eq('tournament_id', tournamentId)

  if (played.error) return NextResponse.json({ error: played.error.message }, { status: 500 })

  const playedIds = Array.from(
    new Set((played.data ?? []).map((r: any) => r.game_id).filter(Boolean))
  )

  // Helper for "exclude played"
  const excludePlayed = (q: any) => (playedIds.length ? q.not('id', 'in', `(${playedIds.join(',')})`) : q)

  // 4) No tags selected
  if (tagSlugs.length === 0) {
    let q = supabaseServer
      .from('games')
      .select('id, name, min_players, max_players, playtime_minutes, notes')
      .eq('is_active', true)

    q = excludePlayed(q)

    const { data, error } = await q

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No unplayed games found for the active tournament.' }, { status: 404 })
    }

    const game = data[Math.floor(Math.random() * data.length)]
    return NextResponse.json({ game, tournamentId })
  }

  // 5) Tags selected (OR semantics)
let q = (supabaseServer as any)
  .from('games')
  .select(
    `
    id, name, min_players, max_players, playtime_minutes, notes,
    game_tags!inner(
      tags!inner(slug)
    )
    `
  )
  .eq('is_active', true)
  .in('game_tags.tags.slug' as any, tagSlugs) // nested path typing workaround

  q = excludePlayed(q)

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json(
      { message: `No unplayed games found for tags: ${tagSlugs.join(', ')}` },
      { status: 404 }
    )
  }

  const game = data[Math.floor(Math.random() * data.length)]
  return NextResponse.json({ game, tournamentId })
}
