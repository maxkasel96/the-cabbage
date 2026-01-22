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
                <div
                  key={player.id}
                  className="group relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border-strong)] bg-[var(--surface)] shadow-[0_10px_20px_rgba(24,32,18,0.12)] transition-transform duration-200 ease-out hover:-translate-y-0.5"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`Player card for ${player.display_name}`}
                      fill
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)] text-sm text-[color:var(--text-secondary)]">
                      No card image available.
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/5" />
                  <div
                    className="pointer-events-none absolute left-4 top-4 z-10 bg-emerald-100/95 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.28em] text-emerald-900 shadow-sm"
                    style={{
                      clipPath:
                        'polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%, 6% 50%)',
                      transform: 'rotate(-12deg)',
                    }}
                  >
                    The Cabbage League
                  </div>
                  <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-lg bg-black/65 px-4 py-3 text-right text-white shadow-md">
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/80">
                      All Star
                    </span>
                    <span className="block text-lg font-semibold leading-tight">
                      {player.display_name}
                    </span>
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
