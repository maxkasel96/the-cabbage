import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[var(--page-background)] text-[var(--text-primary)]">
      <div className="pageShell px-6 pb-12 pt-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Rules</PageTitle>
      </div>
    </main>
  )
}
