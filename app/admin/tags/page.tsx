'use client'

import { useEffect, useMemo, useState } from 'react'
import Nav from '@/app/components/Nav'
import AdminSubNav from '@/app/components/AdminSubNav'
import PageTitle from '@/app/components/PageTitle'

type Tag = {
  id: string
  slug: string
  label: string
  sort_order: number
}

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const [search, setSearch] = useState('')

  // Create form
  const [newLabel, setNewLabel] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newSortOrder, setNewSortOrder] = useState<number>(100)
  const [creating, setCreating] = useState(false)

  async function loadTags() {
    setLoading(true)
    setStatus('')

    const res = await fetch('/api/tags')
    const json = await res.json()

    if (!res.ok) {
      setStatus(json.error || 'Failed to load tags')
      setLoading(false)
      return
    }

    setTags(json.tags ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTags()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tags
    return tags.filter(
      (t) => t.label.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    )
  }, [tags, search])

  async function createTag() {
    const label = newLabel.trim()
    const slug = newSlug.trim()

    if (!label) {
      setStatus('Label is required.')
      return
    }

    setCreating(true)
    setStatus('')

    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        slug: slug || null,
        sort_order: Number.isFinite(newSortOrder) ? newSortOrder : 100,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setStatus(json.error || 'Failed to create tag')
      setCreating(false)
      return
    }

    // Add to UI immediately
    setTags((prev) => {
      if (prev.some((t) => t.id === json.tag.id)) return prev
      return [json.tag, ...prev].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label))
    })

    // Reset form
    setNewLabel('')
    setNewSlug('')
    setNewSortOrder(100)
    setCreating(false)
    setStatus(`Added tag: ${json.tag.label}`)
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: 'var(--ceramic-sage)',
        color: 'var(--deep-stem-green)',
        minHeight: '100vh',
      }}
    >
      <PageTitle>Admin: Tags</PageTitle>
      <AdminSubNav />
      <Nav showAdminMenu={false} />

      {/* Create tag */}
      <div
        style={{
          border: '1px solid var(--gloss-highlight)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 16,
          maxWidth: 820,
          background: 'var(--pale-celery)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Add a new tag</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g., Shouty Games)"
            style={{ padding: 10, minWidth: 260 }}
            disabled={creating}
          />

          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="Slug (optional, e.g., shouty_games)"
            style={{ padding: 10, minWidth: 260 }}
            disabled={creating}
          />

          <input
            type="number"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(parseInt(e.target.value || '100', 10))}
            style={{ padding: 10, width: 140 }}
            disabled={creating}
            title="Lower shows first"
          />

          <button
            onClick={createTag}
            style={{ padding: '10px 14px', cursor: creating ? 'not-allowed' : 'pointer' }}
            disabled={creating}
          >
            {creating ? 'Adding…' : 'Add tag'}
          </button>

          {status && (
            <span style={{ opacity: 0.85 }}>
              <strong>{status}</strong>
            </span>
          )}
        </div>

        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
          If you leave slug blank, it will be auto-generated from the label.
        </div>
      </div>

      {/* Search + refresh */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags…"
          style={{ padding: 10, minWidth: 260 }}
        />
        <button onClick={loadTags} style={{ padding: '10px 14px' }}>
          Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No tags found.</p>
      ) : (
        <div
          style={{
            border: '1px solid var(--gloss-highlight)',
            borderRadius: 10,
            overflow: 'hidden',
            maxWidth: 820,
            background: 'var(--pale-celery)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1fr',
              background: 'var(--cabbage-green)',
              padding: 10,
              fontWeight: 700,
              color: 'var(--pale-celery)',
            }}
          >
            <div>Label</div>
            <div>Slug</div>
            <div>Sort</div>
          </div>

          {filtered
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label))
            .map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr',
                  padding: 10,
                  borderTop: '1px solid var(--gloss-highlight)',
                  background: 'rgba(230, 239, 224, 0.7)',
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.label}</div>
                <div style={{ opacity: 0.85 }}>{t.slug}</div>
                <div style={{ opacity: 0.85 }}>{t.sort_order}</div>
              </div>
            ))}
        </div>
      )}
    </main>
  )
}
