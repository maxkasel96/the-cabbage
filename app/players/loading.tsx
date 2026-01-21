import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

export default function PlayersLoading() {
  return (
    <main className="min-h-screen bg-[var(--page-background)] text-[var(--text-primary)]">
      <div className="pageShell px-6 pb-12 pt-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Players</PageTitle>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-[color:var(--text-secondary)]">
          <p>Loading the roster...</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`player-skeleton-${index}`}
              className="relative aspect-[3/4] w-full animate-pulse rounded-[22px] border-[6px] border-[#d6c8a5] bg-[#f6efdc] shadow-[0_12px_20px_rgba(24,32,18,0.18)]"
            >
              <div className="absolute inset-0 flex flex-col gap-4 p-4">
                <div className="h-6 w-full rounded-full bg-[#d9d1bb]" />
                <div className="flex-1 rounded-[18px] bg-[#d1c7ac]" />
                <div className="h-16 rounded-[14px] bg-[#d9d1bb]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
