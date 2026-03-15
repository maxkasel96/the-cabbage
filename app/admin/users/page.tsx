'use client'

import { useEffect, useState } from 'react'
import AdminSubNav from '@/app/components/AdminSubNav'
import Nav from '@/app/components/Nav'
import PageTitle from '@/app/components/PageTitle'

type UserRole = 'admin' | 'member'

type AdminUser = {
  id: string
  email: string | null
  role: UserRole
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/admin/roles', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load users.')
      setLoading(false)
      return
    }

    setUsers(json.users ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const updateRole = async (userId: string, role: UserRole) => {
    setSavingUserId(userId)
    setStatus('')

    const res = await fetch('/api/admin/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to update role.')
      setSavingUserId(null)
      return
    }

    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)))
    setSavingUserId(null)
    setStatus('Role updated.')
  }

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
        <div className="admin-layout">
          <AdminSubNav />
          <div className="admin-content">
            <PageTitle>Admin: Users</PageTitle>
            <p>Assign one of the two supported roles: member or admin.</p>

            {status ? <p>{status}</p> : null}

            {loading ? <p>Loading users...</p> : null}

            {!loading ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Current role</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Set role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        {user.email ?? 'No email'}
                      </td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        {user.role}
                      </td>
                      <td style={{ padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
                        <select
                          disabled={savingUserId === user.id}
                          value={user.role}
                          onChange={(event) => {
                            void updateRole(user.id, event.target.value as UserRole)
                          }}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
