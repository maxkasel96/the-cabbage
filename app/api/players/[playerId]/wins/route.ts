import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  params: Promise<{ playerId: string }>
}

type SeasonSummary = {
  id: string
  label: string
  wins: number
  losses: number
  cabbageDraws: number
  totalGames: number
  yearStart?: number | null
  yearEnd?: number | null
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_: NextRequest, { params }: Params) {
  const { playerId } = await params
  if (!uuidPattern.test(playerId)) {
    return NextResponse.json({ error: 'Invalid player id.' }, { status: 400 })
  }

  const [
    { data: tournaments, error: tournamentsError },
    { data: wins, error: winsError },
    { data: losses, error: lossesError },
    { data: selectionEvents, error: selectionEventsError },
    { data: tournamentGames, error: tournamentGamesError },
  ] = await Promise.all([
    supabaseServer
      .from('tournaments')
      .select('id,label,year_start,year_end')
      .order('year_start', { ascending: false })
      .order('year_end', { ascending: false }),
    supabaseServer
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
      .not('played_at', 'is', null),
    supabaseServer
      .from('player_losses_by_tournament')
      .select(
        `
          tournament_id,
          losses,
          tournaments:tournament_id (
            id,
            label,
            year_start,
            year_end
          )
        `
      )
      .eq('player_id', playerId),
    supabaseServer
      .from('player_selection_events')
      .select(
        `
          tournament_id,
          tournaments:tournament_id (
            id,
            label,
            year_start,
            year_end
          )
        `
      )
      .eq('player_id', playerId),
    supabaseServer.from('plays').select('tournament_id').not('played_at', 'is', null),
  ])

  if (tournamentsError) {
    return NextResponse.json({ error: tournamentsError.message }, { status: 500 })
  }

  if (winsError) return NextResponse.json({ error: winsError.message }, { status: 500 })

  if (lossesError) return NextResponse.json({ error: lossesError.message }, { status: 500 })

  if (selectionEventsError) {
    return NextResponse.json({ error: selectionEventsError.message }, { status: 500 })
  }

  if (tournamentGamesError) {
    return NextResponse.json({ error: tournamentGamesError.message }, { status: 500 })
  }

  const totalGamesByTournament = new Map<string, number>()
  ;(tournamentGames ?? []).forEach((game: any) => {
    const tournamentId = game?.tournament_id ?? 'unknown'
    totalGamesByTournament.set(tournamentId, (totalGamesByTournament.get(tournamentId) ?? 0) + 1)
  })

  const totalsBySeason = new Map<string, SeasonSummary>()

  ;(tournaments ?? []).forEach((season) => {
    const yearStart = season.year_start ?? null
    const yearEnd = season.year_end ?? null
    const label = season.label ?? 'Unknown tournament'

    totalsBySeason.set(season.id, {
      id: season.id,
      label,
      wins: 0,
      losses: 0,
      cabbageDraws: 0,
      totalGames: totalGamesByTournament.get(season.id) ?? 0,
      yearStart,
      yearEnd,
    })
  })

  ;(wins ?? []).forEach((play: any) => {
    const season = play.tournaments
    const seasonId = season?.id ?? play.tournament_id ?? 'unknown'
    const yearStart = season?.year_start ?? null
    const yearEnd = season?.year_end ?? null
    const label = season?.label ?? 'Unknown tournament'

    const existing = totalsBySeason.get(seasonId)
    if (existing) {
      existing.wins += 1
    } else {
      totalsBySeason.set(seasonId, {
        id: seasonId,
        label,
        wins: 1,
        losses: 0,
        cabbageDraws: 0,
        totalGames: totalGamesByTournament.get(seasonId) ?? 0,
        yearStart,
        yearEnd,
      })
    }
  })

  ;(losses ?? []).forEach((entry: any) => {
    const season = entry.tournaments
    const seasonId = season?.id ?? entry.tournament_id ?? 'unknown'
    const yearStart = season?.year_start ?? null
    const yearEnd = season?.year_end ?? null
    const label = season?.label ?? 'Unknown tournament'

    const existing = totalsBySeason.get(seasonId)
    if (existing) {
      existing.losses += entry.losses ?? 0
    } else {
      totalsBySeason.set(seasonId, {
        id: seasonId,
        label,
        wins: 0,
        losses: entry.losses ?? 0,
        cabbageDraws: 0,
        totalGames: totalGamesByTournament.get(seasonId) ?? 0,
        yearStart,
        yearEnd,
      })
    }
  })

  ;(selectionEvents ?? []).forEach((entry: any) => {
    const season = entry.tournaments
    const seasonId = season?.id ?? entry.tournament_id ?? 'unknown'
    const yearStart = season?.year_start ?? null
    const yearEnd = season?.year_end ?? null
    const label = season?.label ?? 'Unknown tournament'

    const existing = totalsBySeason.get(seasonId)
    if (existing) {
      existing.cabbageDraws += 1
    } else {
      totalsBySeason.set(seasonId, {
        id: seasonId,
        label,
        wins: 0,
        losses: 0,
        cabbageDraws: 1,
        totalGames: totalGamesByTournament.get(seasonId) ?? 0,
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

  const totalWins = winsBySeason.reduce((sum, season) => sum + season.wins, 0)

  return NextResponse.json({
    totalWins,
    winsBySeason,
  })
}
