import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'
import { supabaseServer } from '@/lib/supabaseServer'

type Player = {
  id: string
  display_name: string
  is_active: boolean
  avatar_path?: string | null
  card_path?: string | null
}

type SeasonSummary = {
  id: string
  label: string
  wins: number
  yearStart?: number | null
  yearEnd?: number | null
}

type PlayerStats = {
  totalWins: number
  totalLosses: number
  winsBySeason: SeasonSummary[]
}

type PlayerWithStats = Player & {
  stats: PlayerStats
}

export const dynamic = 'force-dynamic'

const buildSeasonLabel = (season: any, fallbackId: string) => {
  const yearStart = season?.year_start ?? null
  const yearEnd = season?.year_end ?? null
  if (yearStart && yearEnd) {
    return {
      id: season?.id ?? fallbackId,
      label: `${yearStart}–${yearEnd}`,
      yearStart,
      yearEnd,
    }
  }

  return {
    id: season?.id ?? fallbackId,
    label: season?.label ?? 'Unknown season',
    yearStart,
    yearEnd,
  }
}

const sortSeasons = (seasons: SeasonSummary[]) =>
  seasons.sort((a, b) => {
    const aScore = (a.yearStart ?? 0) * 10000 + (a.yearEnd ?? 0)
    const bScore = (b.yearStart ?? 0) * 10000 + (b.yearEnd ?? 0)
    if (aScore !== bScore) return bScore - aScore
    return b.label.localeCompare(a.label)
  })

async function loadPlayersWithStats(): Promise<{ players: PlayerWithStats[]; status?: string }> {
  const { data: playersData, error: playersError } = await supabaseServer
    .from('players')
    .select('id, display_name, is_active, avatar_path, card_path')
    .order('display_name')

  if (playersError) {
    return { players: [], status: playersError.message }
  }

  const statusMessages: string[] = []

  // Aggregation uses plays + game_winners.player_id joined with tournaments for season labels.
  const { data: winsData, error: winsError } = await supabaseServer
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
        game_winners (
          player_id
        )
      `
    )
    .not('played_at', 'is', null)

  const statsByPlayer = new Map<
    string,
    {
      totalWins: number
      totalLosses: number
      winsBySeason: Map<string, SeasonSummary>
    }
  >()

  if (!winsError && winsData) {
    winsData.forEach((play: any) => {
      const seasonInfo = buildSeasonLabel(play.tournaments, play.tournament_id ?? 'unknown')
      const winnerIds = (play.game_winners ?? [])
        .map((winner: any) => winner.player_id)
        .filter((playerId: string | null): playerId is string => Boolean(playerId))
      const winners = new Set<string>(winnerIds)

      winners.forEach((playerId) => {
        const current =
          statsByPlayer.get(playerId) ??
          { totalWins: 0, totalLosses: 0, winsBySeason: new Map<string, SeasonSummary>() }

        current.totalWins += 1
        const existing = current.winsBySeason.get(seasonInfo.id)
        if (existing) {
          existing.wins += 1
        } else {
          current.winsBySeason.set(seasonInfo.id, {
            id: seasonInfo.id,
            label: seasonInfo.label,
            wins: 1,
            yearStart: seasonInfo.yearStart,
            yearEnd: seasonInfo.yearEnd,
          })
        }

        statsByPlayer.set(playerId, current)
      })
    })
  } else if (winsError) {
    statusMessages.push(winsError.message)
  }

  if ((playersData ?? []).length > 0) {
    const { data: activeTournament, error: activeTournamentError } = await supabaseServer
      .from('tournaments')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    if (activeTournamentError) {
      statusMessages.push(activeTournamentError.message)
    }

    if (activeTournament?.id) {
      const { data: playedGames, error: playedGamesError } = await supabaseServer
        .from('plays')
        .select(
          `
            id,
            played_at,
            winners_finalized_at,
            game_winners (
              player_id
            )
          `
        )
        .eq('tournament_id', activeTournament.id)
        .not('played_at', 'is', null)

      if (playedGamesError) {
        statusMessages.push(playedGamesError.message)
      }

      if (!playedGamesError && playedGames) {
        const playIds = playedGames.map((play: any) => play.id).filter(Boolean)
        let playPlayerEntries: { play_id: string; player_id: string }[] = []
        if (playIds.length > 0) {
          const { data: playPlayersData, error: playPlayersLookupError } = await supabaseServer
            .from('play_players')
            .select('play_id, player_id')
            .in('play_id', playIds)

          if (playPlayersLookupError) {
            statusMessages.push(playPlayersLookupError.message)
          } else {
            playPlayerEntries = playPlayersData ?? []
          }
        }

        const playersByPlay = new Map<string, Set<string>>()
        playPlayerEntries.forEach((entry) => {
          if (!entry.play_id || !entry.player_id) return
          const current = playersByPlay.get(entry.play_id) ?? new Set<string>()
          current.add(entry.player_id)
          playersByPlay.set(entry.play_id, current)
        })

        playedGames.forEach((play: any) => {
          const playTimestamp = play.winners_finalized_at ?? play.played_at
          if (!playTimestamp) return
          const winnerIds = (play.game_winners ?? [])
            .map((winner: any) => winner.player_id)
            .filter((playerId: string | null): playerId is string => Boolean(playerId))
          const winners = new Set<string>(winnerIds)
          const participants = playersByPlay.get(play.id) ?? new Set<string>()

          participants.forEach((playerId) => {
            if (winners.has(playerId)) return

            const current =
              statsByPlayer.get(playerId) ??
              { totalWins: 0, totalLosses: 0, winsBySeason: new Map<string, SeasonSummary>() }

            current.totalLosses += 1
            statsByPlayer.set(playerId, current)
          })
        })
      }
    }
  }

  const players = (playersData ?? []).map((player) => {
    const stats = statsByPlayer.get(player.id)
    const winsBySeason = stats ? sortSeasons(Array.from(stats.winsBySeason.values())) : []

    return {
      ...player,
      stats: {
        totalWins: stats?.totalWins ?? 0,
        totalLosses: stats?.totalLosses ?? 0,
        winsBySeason,
      },
    }
  })

  return {
    players,
    status: statusMessages.length > 0 ? statusMessages.join(' | ') : undefined,
  }
}

export default async function PlayersLandingPage() {
  const { players, status } = await loadPlayersWithStats()

  return (
    <main className="min-h-screen bg-[var(--page-background)] text-[var(--text-primary)]">
      <div className="pageShell px-6 pb-12 pt-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Players</PageTitle>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-[color:var(--text-secondary)]">
          <p>Browse every saved player and explore their all-time cabbage victories.</p>
          {status ? (
            <span className="rounded-full border border-[color:var(--border-strong)] bg-[var(--surface)] px-3 py-1 text-sm font-semibold text-[color:var(--text-primary)]">
              {status}
            </span>
          ) : null}
        </div>

        {players.length === 0 ? (
          <p>No players found.</p>
        ) : (
          <ul className="space-y-6">
            {players.map((player) => (
              <li
                key={player.id}
                className="rounded-2xl border border-[color:var(--border-strong)] bg-[var(--surface)] p-4 shadow-[0_10px_20px_rgba(24,32,18,0.12)]"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
                    {player.display_name}
                  </h2>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Total wins: <span className="font-semibold">{player.stats.totalWins}</span>
                  </p>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Active tournament losses:{' '}
                    <span className="font-semibold">{player.stats.totalLosses}</span>
                  </p>
                </div>
                <div className="mt-4">
                  {player.stats.winsBySeason.length === 0 ? (
                    <p className="text-sm text-[color:var(--text-secondary)]">
                      No wins recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {player.stats.winsBySeason.map((season) => (
                        <li
                          key={season.id}
                          className="flex items-center justify-between rounded-lg border border-[color:var(--border-strong)]/70 bg-[color:var(--page-background)] px-3 py-2 text-sm"
                        >
                          <span className="text-[color:var(--text-secondary)]">{season.label}</span>
                          <span className="font-semibold text-[color:var(--text-primary)]">
                            {season.wins}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
