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
        <div className="space-y-6" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`player-skeleton-${index}`}
              className="animate-pulse rounded-2xl border border-[color:var(--border-strong)] bg-[var(--surface)] p-4 shadow-[0_10px_20px_rgba(24,32,18,0.12)]"
            >
              <div className="space-y-3">
                <div className="h-5 w-1/2 rounded-full bg-[color:var(--page-background)]" />
                <div className="h-4 w-1/3 rounded-full bg-[color:var(--page-background)]" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-8 w-full rounded-lg bg-[color:var(--page-background)]" />
                <div className="h-8 w-full rounded-lg bg-[color:var(--page-background)]" />
                <div className="h-8 w-full rounded-lg bg-[color:var(--page-background)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
