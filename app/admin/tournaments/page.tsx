'use client'

import { useEffect, useState } from 'react'
import Nav from '@/app/components/Nav'

type Tournament = {
  id: string
  label: string
  year_start: number
  year_end: number
  is_active: boolean
  created_at: string
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const [label, setLabel] = useState('Dec 2026 – Jan 2027')
  const [yearStart, setYearStart] = useState<number>(2026)

  async function loadTournaments() {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/tournaments', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load tournaments')
      setLoading(false)
      return
    }

    setTournaments(json.tournaments ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTournaments()
  }, [])

  const yearEnd = yearStart + 1
  const active = tournaments.find((t) => t.is_active)

  async function startNewTournament() {
    setStatus('')

    const ok = window.confirm(
      `Start a new tournament and set it active?\n\nNew: ${label} (${yearStart}-${yearEnd})\n\nThis will NOT delete data, but it WILL reset picks for the new year.`
    )
    if (!ok) return

    const res = await fetch('/api/admin/tournaments/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, year_start: yearStart, year_end: yearEnd }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to start new tournament')
      return
    }

    setStatus(`Active tournament set to: ${json.tournament.label} (${json.tournament.year_start}-${json.tournament.year_end})`)
    await loadTournaments()
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <Nav />
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Admin: Tournaments</h1>

      <div style={{ marginBottom: 16, opacity: 0.85 }}>
        {active ? (
          <>
            <strong>Active:</strong> {active.label} ({active.year_start}-{active.year_end})
          </>
        ) : (
          <strong>No active tournament set</strong>
        )}
      </div>

      {/* Start new */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 10,
          padding: 14,
          marginBottom: 18,
          maxWidth: 760,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800 }}>Start new tournament</div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ padding: 10 }}
            placeholder="Dec 2026 – Jan 2027"
          />
        </label>

        <label style={{ display: 'grid', gap: 6, maxWidth: 220 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Year start</span>
          <input
            type="number"
            value={yearStart}
            onChange={(e) => setYearStart(Number(e.target.value))}
            style={{ padding: 10 }}
          />
        </label>

        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Year end will be set to <strong>{yearEnd}</strong>.
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={startNewTournament} style={{ padding: '10px 14px', cursor: 'pointer' }}>
            Start new tournament (set active)
          </button>

          <button onClick={loadTournaments} style={{ padding: '10px 14px', cursor: 'pointer' }}>
            Refresh
          </button>

          {status && (
            <span style={{ opacity: 0.85 }}>
              <strong>{status}</strong>
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>All tournaments</div>

      {loading ? (
        <p>Loading…</p>
      ) : tournaments.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No tournaments found.</p>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', maxWidth: 900 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: '#388e4a',
              padding: 10,
              fontWeight: 700,
            }}
          >
            <div>Label</div>
            <div>Years</div>
            <div>Status</div>
            <div>Created</div>
          </div>

          {tournaments.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: 10,
                borderTop: '1px solid #eee',
              }}
            >
              <div>{t.label}</div>
              <div>
                {t.year_start}-{t.year_end}
              </div>
              <div style={{ fontWeight: 700 }}>{t.is_active ? 'Active' : '—'}</div>
              <div style={{ opacity: 0.75 }}>{new Date(t.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
