import Image from 'next/image'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'
import { getAvatarPublicUrl } from '@/lib/getAvatarPublicUrl'
import { supabaseServer } from '@/lib/supabaseServer'

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
            {players.map((player) => {
              const imageUrl = getAvatarPublicUrl(player.card_path ?? player.avatar_path)

              return (
                <div key={player.id} className="player-card">
                  <div className="player-card__image">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={`Player card for ${player.display_name}`}
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                        className="player-card__img"
                      />
                    ) : (
                      <span className="player-card__fallback">No card image available.</span>
                    )}
                  </div>

                  <div className="player-card__pennant" aria-hidden="true">
                    <span className="player-card__pennant-text">The Cabbage League</span>
                  </div>

                  <div className="player-card__nameplate">
                    <div className="player-card__title">Bad Ass</div>
                    <div className="player-card__player-name">{player.display_name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
