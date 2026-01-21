import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'
import PlayerBaseballCard from '../components/PlayerBaseballCard'
import { supabaseServer } from '@/lib/supabaseServer'

type Player = {
  id: string
  display_name: string
  is_active: boolean
  avatar_path?: string | null
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
    .select('id, display_name, is_active, avatar_path')
    .order('display_name')

  if (playersError) {
    return { players: [], status: playersError.message }
  }

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
      winsBySeason: Map<string, SeasonSummary>
    }
  >()

  if (!winsError && winsData) {
    winsData.forEach((play: any) => {
      const seasonInfo = buildSeasonLabel(play.tournaments, play.tournament_id ?? 'unknown')
      const winners = new Set(
        (play.game_winners ?? [])
          .map((winner: any) => winner.player_id)
          .filter(Boolean)
      )

      winners.forEach((playerId: string) => {
        const current =
          statsByPlayer.get(playerId) ??
          { totalWins: 0, winsBySeason: new Map<string, SeasonSummary>() }

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
  }

  const players = (playersData ?? []).map((player) => {
    const stats = statsByPlayer.get(player.id)
    const winsBySeason = stats ? sortSeasons(Array.from(stats.winsBySeason.values())) : []

    return {
      ...player,
      stats: {
        totalWins: stats?.totalWins ?? 0,
        winsBySeason,
      },
    }
  })

  return {
    players,
    status: winsError?.message,
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {players.map((player) => (
              <PlayerBaseballCard key={player.id} player={player} stats={player.stats} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
