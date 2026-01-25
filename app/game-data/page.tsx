'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

type GameDataRow = {
  id: string
  name: string
  suggestionCount: number
  played: boolean
}

export default function GameDataPage() {
  const [rows, setRows] = useState<GameDataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  async function loadGameData() {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/game-data', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatus(json.error || 'Failed to load game data')
      setRows([])
      setLoading(false)
      return
    }

    setRows(json.rows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadGameData()
  }, [])

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
      <div className="pageShell px-4 pb-12 pt-6 sm:px-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>GAME DATA</PageTitle>

        <section
          style={{
            marginTop: 20,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 16px 34px rgba(63, 90, 42, 0.12)',
          }}
        >
          <header style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Suggested Games</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
              Counts reflect how many times each game has been suggested to players in the active tournament.
            </p>
          </header>

          {status ? (
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(220, 53, 69, 0.12)', color: '#b91c1c' }}>
              {status}
            </div>
          ) : null}

          {loading ? (
            <p style={{ marginTop: 12 }}>Loading game data…</p>
          ) : rows.length === 0 ? (
            <p style={{ marginTop: 12 }}>No game data available for the active tournament.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: 12,
                  fontSize: 15,
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--divider-soft)' }}>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Game</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}># of Times Suggested</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Played?</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--divider-soft)' }}>
                      <td style={{ padding: '10px 8px' }}>{row.name}</td>
                      <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>
                        {row.suggestionCount}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          aria-label={row.played ? 'Marked as played' : 'Not marked as played'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            background: row.played ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.16)',
                            color: row.played ? '#15803d' : '#b91c1c',
                            fontWeight: 700,
                          }}
                        >
                          {row.played ? '✓' : '✕'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
