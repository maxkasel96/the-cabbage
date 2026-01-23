import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { getActiveTournamentId } from '@/lib/getActiveTournamentId'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedTournamentId = searchParams.get('tournamentId')?.trim()
  const tournamentId = requestedTournamentId || (await getActiveTournamentId())
  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('plays')
    .select(
      `
      id,
      played_at,
      played_note,
      games:game_id (
        id,
        name
      ),
      game_winners (
        win_image,
        players (
          id,
          display_name,
          avatar_path
        )
      )
    `
    )
    .eq('tournament_id', tournamentId)
    .not('played_at', 'is', null)
    .order('played_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = (data ?? []).map((p: any) => {
    const winners =
      (p.game_winners ?? [])
        .map((gw: any) => gw.players)
        .filter(Boolean)
        .reduce((acc: any[], pl: any) => {
          if (!acc.some((x) => x.id === pl.id)) acc.push(pl)
          return acc
        }, [])
    const winImages = (p.game_winners ?? [])
      .map((gw: any) => {
        if (typeof gw.win_image !== 'string') return []
        const trimmed = gw.win_image.trim()
        if (!trimmed) return []
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed)
            return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
          } catch {
            return [trimmed]
          }
        }
        return [trimmed]
      })
      .flat()
      .filter(Boolean)
    const uniqueWinImages = Array.from(new Set(winImages))

    return {
      id: p.id, // play id
      game_id: p.games?.id ?? null,
      name: p.games?.name ?? '(unknown game)',
      played_at: p.played_at,
      notes: p.played_note ?? null,
      winners,
      win_images: uniqueWinImages,
    }
  })

  return NextResponse.json({ history, tournamentId })
}
