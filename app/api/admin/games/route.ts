import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

/**
 * Row shapes returned by Supabase
 */

type TagRow = {
  id: string
  slug: string
  label: string
  sort_order: number | null
}

type GameTagRow = {
  tags: TagRow | null
}

type GameRow = {
  id: string
  name: string
  is_active: boolean
  played_at: string | null
  game_tags: GameTagRow[] | null
}

/**
 * API handler
 */
export async function GET() {
  const { data, error } = await supabaseServer
    .from('games')
    .select(
      `
      id,
      name,
      is_active,
      played_at,
      game_tags (
        tags ( id, slug, label, sort_order )
      )
    `
    )
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const games = ((data ?? []) as unknown as GameRow[]).map((g) => ({
    id: g.id,
    name: g.name,
    is_active: g.is_active,
    played_at: g.played_at,
    tags: (g.game_tags ?? [])
      .map((gt) => gt.tags)
      .filter((t): t is TagRow => Boolean(t))
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.label.localeCompare(b.label)
      ),
  }))

  return NextResponse.json({ games })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const name = (body?.name as string | undefined)?.trim() ?? ''
  const is_active = (body?.is_active as boolean | undefined) ?? true

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const ins = await supabaseServer
    .from('games')
    .insert([{ name, is_active }])
    .select('id, name, is_active, played_at')
    .single()

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ game: { ...ins.data, tags: [] } }, { status: 201 })
}

