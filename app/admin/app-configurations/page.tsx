'use client'

import AdminSubNav from '@/app/components/AdminSubNav'
import Nav from '@/app/components/Nav'
import PageTitle from '@/app/components/PageTitle'

export default function AdminAppConfigurationsPage() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: 'var(--page-background)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      <div className="pageShell">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>App configurations</PageTitle>
        <AdminSubNav />
        <p>test</p>
      </div>
    </main>
  )
}
