import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  params: Promise<{ playerId: string }>
}

type SeasonSummary = {
  id: string
  label: string
  wins: number
  yearStart?: number | null
  yearEnd?: number | null
}

export async function GET(_: NextRequest, { params }: Params) {
  const { playerId } = await params
  const { data, error } = await supabaseServer
    .from('plays')
    .select(
      `
        id,
        played_at,
        tournament_id,
        tournaments:tournament_id (
          id,
          label,
          year_start,
          year_end
        ),
        game_winners!inner (
          player_id
        )
      `
    )
    .eq('game_winners.player_id', playerId)
    .not('played_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const wins = data ?? []
  const totalsBySeason = new Map<string, SeasonSummary>()

  wins.forEach((play: any) => {
    const season = play.tournaments
    const seasonId = season?.id ?? play.tournament_id ?? 'unknown'
    const yearStart = season?.year_start ?? null
    const yearEnd = season?.year_end ?? null
    const label =
      yearStart && yearEnd
        ? `${yearStart}–${yearEnd}`
        : season?.label ?? 'Unknown season'

    const existing = totalsBySeason.get(seasonId)
    if (existing) {
      existing.wins += 1
    } else {
      totalsBySeason.set(seasonId, {
        id: seasonId,
        label,
        wins: 1,
        yearStart,
        yearEnd,
      })
    }
  })

  const winsBySeason = Array.from(totalsBySeason.values()).sort((a, b) => {
    const aScore = (a.yearStart ?? 0) * 10000 + (a.yearEnd ?? 0)
    const bScore = (b.yearStart ?? 0) * 10000 + (b.yearEnd ?? 0)
    if (aScore !== bScore) return bScore - aScore
    return b.label.localeCompare(a.label)
  })

  return NextResponse.json({
    totalWins: wins.length,
    winsBySeason,
  })
}
