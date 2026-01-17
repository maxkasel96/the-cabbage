import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('games')
    .select(
      `
      id,
      name,
      played_at,
      game_winners (
        players (
          id,
          display_name
        )
      )
    `
    )
    .not('played_at', 'is', null)
    .order('played_at', { ascending: false })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = (data ?? []).map((g: any) => {
    const winners =
      (g.game_winners ?? [])
        .map((gw: any) => gw.players)
        .filter(Boolean)
        // Deduplicate just in case
        .reduce((acc: any[], p: any) => {
          if (!acc.some((x) => x.id === p.id)) acc.push(p)
          return acc
        }, [])

    return {
      id: g.id,
      name: g.name,
      played_at: g.played_at,
      winners, // array: [{ id, display_name }, ...]
    }
  })

  return NextResponse.json({ history })
}

