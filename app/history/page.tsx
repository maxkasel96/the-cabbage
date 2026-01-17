'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'

type HistoryRow = {
  id: string
  name: string
  played_at: string
  winner: { id: string; display_name: string } | null
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  async function loadHistory() {
    setLoading(true)
    setStatus('')
    const res = await fetch('/api/history')
    const json = await res.json()

    if (!res.ok) {
      setStatus(json.error || 'Failed to load history')
      setLoading(false)
      return
    }

    setHistory(json.history ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return history
    return history.filter((h) => h.name.toLowerCase().includes(q) || (h.winner?.display_name ?? '').toLowerCase().includes(q))
  }, [history, search])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>History</h1>
      <Nav />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search game or winner…"
          style={{ padding: 10, minWidth: 260 }}
        />
        <button onClick={loadHistory} style={{ padding: '10px 14px', cursor: 'pointer' }}>
          Refresh
        </button>
        {status && (
          <span style={{ opacity: 0.85 }}>
            <strong>{status}</strong>
          </span>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No played games yet.</p>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', maxWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 0, background: '#f6f6f6', padding: 10, fontWeight: 700 }}>
            <div>Game</div>
            <div>Winner</div>
            <div>Played</div>
          </div>

          {filtered.map((h) => (
            <div
              key={h.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                padding: 10,
                borderTop: '1px solid #eee',
              }}
            >
              <div>{h.name}</div>
              <div style={{ opacity: 0.9 }}>{h.winner?.display_name ?? '—'}</div>
              <div style={{ opacity: 0.75 }}>
                {new Date(h.played_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
