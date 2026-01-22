import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'
import { supabaseServer } from '@/lib/supabaseServer'
import PlayerCard from './PlayerCard'

type Player = {
  id: string
  display_name: string
  card_path?: string | null
  avatar_path?: string | null
}

export const dynamic = 'force-dynamic'

async function loadPlayers(): Promise<{ players: Player[]; status?: string }> {
  const { data, error } = await supabaseServer
    .from('players')
    .select('id, display_name, card_path, avatar_path')
    .order('display_name')

  if (error) {
    return { players: [], status: error.message }
  }

  return { players: data ?? [] }
}

export default async function PlayerCardsPage() {
  const { players, status } = await loadPlayers()

  return (
    <main className="min-h-screen bg-[var(--page-background)] text-[var(--text-primary)]">
      <div className="pageShell px-6 pb-12 pt-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Player Cards</PageTitle>
        <p className="mb-6 text-[color:var(--text-secondary)]">
          Browse the latest player card images.
        </p>
        {status ? (
          <p className="mb-6 rounded-full border border-[color:var(--border-strong)] bg-[var(--surface)] px-3 py-1 text-sm font-semibold text-[color:var(--text-primary)]">
            {status}
          </p>
        ) : null}
        {players.length === 0 ? (
          <p>No players found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="relative flex aspect-[3/4] items-center justify-center overflow-hidden border border-[color:var(--border-strong)] bg-[var(--surface)] shadow-[0_10px_20px_rgba(24,32,18,0.12)]"
              >
                <PlayerCard player={player} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
