'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import PageTitle from '../components/PageTitle'

type Tournament = {
  id: string
  label: string
  year_start: number
  year_end: number
  is_active: boolean
}

type RuleEntry = {
  id: string
  tournamentId: string
  content: string
  status: 'Proposed' | 'Accepted' | 'Rejected'
  createdAt: string
  updatedAt: string
}

type RuleRecord = {
  id: string
  tournament_id: string
  content: string
  status: 'Proposed' | 'Accepted' | 'Rejected'
  created_at: string
  updated_at: string
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function RulesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [rules, setRules] = useState<RuleEntry[]>([])
  const [draftText, setDraftText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingRuleIds, setDeletingRuleIds] = useState<string[]>([])

  useEffect(() => {
    const loadTournaments = async () => {
      const res = await fetch('/api/tournaments', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatusMessage(json.error || 'Failed to load tournaments')
        return
      }

      const list: Tournament[] = json.tournaments ?? []
      setTournaments(list)

      const active = list.find((tournament) => tournament.is_active)
      if (active) {
        setActiveTournamentId(active.id)
      } else if (list[0]) {
        setActiveTournamentId(list[0].id)
      }
    }

    const loadRules = async () => {
      const res = await fetch('/api/rules', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatusMessage(json.error || 'Failed to load rules')
        return
      }

      const list: RuleRecord[] = json.rules ?? []
      const mapped = list.map((rule) => ({
        id: rule.id,
        tournamentId: rule.tournament_id,
        content: rule.content,
        status: rule.status,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      }))

      setRules(mapped)
    }

    loadTournaments()
    loadRules()
  }, [])

  const activeTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === activeTournamentId),
    [tournaments, activeTournamentId]
  )

  const activeRules = useMemo(
    () => rules.filter((rule) => rule.tournamentId === activeTournamentId),
    [rules, activeTournamentId]
  )

  const groupedRules = useMemo(() => {
    return {
      Proposed: activeRules.filter((rule) => rule.status === 'Proposed'),
      Accepted: activeRules.filter((rule) => rule.status === 'Accepted'),
      Rejected: activeRules.filter((rule) => rule.status === 'Rejected'),
    }
  }, [activeRules])

  const updateRuleStatus = useCallback(async (ruleId: string, nextStatus: RuleEntry['status']) => {
    setStatusMessage('')
    const res = await fetch('/api/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ruleId, status: nextStatus }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatusMessage(json.error || 'Failed to update rule status')
      return
    }

    const updated: RuleRecord = json.rule
    if (!updated) {
      setStatusMessage('Rule update failed')
      return
    }

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === updated.id
          ? {
              id: updated.id,
              tournamentId: updated.tournament_id,
              content: updated.content,
              status: updated.status,
              createdAt: updated.created_at,
              updatedAt: updated.updated_at,
            }
          : rule
      )
    )
  }, [])

  const handleSubmit = async () => {
    if (!activeTournamentId) {
      setStatusMessage('No active tournament is available for this rule.')
      return
    }

    const trimmed = draftText.trim()
    if (!trimmed) {
      setStatusMessage('Please enter the rule details before submitting.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('')

    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament_id: activeTournamentId, content: trimmed }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatusMessage(json.error || 'Failed to save rule')
      setIsSubmitting(false)
      return
    }

    const created: RuleRecord = json.rule
    if (created) {
      setRules((prev) => [
        {
          id: created.id,
          tournamentId: created.tournament_id,
          content: created.content,
          status: created.status,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        },
        ...prev,
      ])
    }

    setDraftText('')
    setIsSubmitting(false)
    setStatusMessage('Rule submitted in Proposed status.')
  }

  const handleDelete = useCallback(async (ruleId: string) => {
    const confirmDelete = window.confirm('Delete this rule? This cannot be undone.')
    if (!confirmDelete) return

    setStatusMessage('')
    setDeletingRuleIds((prev) => [...prev, ruleId])

    const res = await fetch('/api/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ruleId }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setStatusMessage(json.error || 'Failed to delete rule')
      setDeletingRuleIds((prev) => prev.filter((id) => id !== ruleId))
      return
    }

    setRules((prev) => prev.filter((rule) => rule.id !== ruleId))
    setDeletingRuleIds((prev) => prev.filter((id) => id !== ruleId))
  }, [])

  const renderRuleCard = (rule: RuleEntry, accentClass?: string, timestampLabel?: string) => {
    const isDeleting = deletingRuleIds.includes(rule.id)
    return (
      <article key={rule.id} className={`rules__card${accentClass ? ` ${accentClass}` : ''}`}>
        <p className="rules__content">{rule.content}</p>
        <div className="rules__meta">
          <span>
            {timestampLabel} {formatDateTime(rule.status === 'Proposed' ? rule.createdAt : rule.updatedAt)}
          </span>
          <div className="rules__meta-actions">
            <label className="rules__status-control">
              Status
              <select
                value={rule.status}
                onChange={(event) => updateRuleStatus(rule.id, event.target.value as RuleEntry['status'])}
              >
                <option value="Proposed">Proposed</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </label>
            <button
              type="button"
              className="rules__delete"
              onClick={() => handleDelete(rule.id)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--page-background)] text-[var(--text-primary)]">
      <div className="pageShell px-6 pb-12 pt-6">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Rules</PageTitle>

        <section className="rules__section">
          <header className="rules__header">
            <div>
              <h2 className="rules__title">Rules for the active tournament</h2>
              <p className="rules__subtitle">
                {activeTournament
                  ? `${activeTournament.label} (${activeTournament.year_start}–${activeTournament.year_end})`
                  : 'No active tournament selected.'}
              </p>
            </div>
          </header>

          <div className="rules__editor">
            <p className="rules__editor-label">Propose a new rule</p>
            <textarea
              className="rules__editor-input"
              placeholder="Write the rule details..."
              aria-label="Rule details"
              rows={6}
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
            />
            <div className="rules__editor-actions">
              <button type="button" className="rules__submit" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Submit rule'}
              </button>
              {statusMessage ? <span className="rules__status">{statusMessage}</span> : null}
            </div>
          </div>
        </section>

        <section className="rules__section">
          <h3 className="rules__list-title">Proposed Rules</h3>
          {groupedRules.Proposed.length === 0 ? (
            <p className="rules__empty">No proposed rules yet.</p>
          ) : (
            <div className="rules__list">
              {groupedRules.Proposed.map((rule) => renderRuleCard(rule, undefined, 'Proposed on'))}
            </div>
          )}
        </section>

        <section className="rules__section">
          <h3 className="rules__list-title">Accepted Rules</h3>
          {groupedRules.Accepted.length === 0 ? (
            <p className="rules__empty">No accepted rules yet.</p>
          ) : (
            <div className="rules__list">
              {groupedRules.Accepted.map((rule) => renderRuleCard(rule, 'rules__card--accepted', 'Accepted on'))}
            </div>
          )}
        </section>

        <section className="rules__section">
          <h3 className="rules__list-title">Rejected Rules</h3>
          {groupedRules.Rejected.length === 0 ? (
            <p className="rules__empty">No rejected rules yet.</p>
          ) : (
            <div className="rules__list">
              {groupedRules.Rejected.map((rule) => renderRuleCard(rule, 'rules__card--rejected', 'Rejected on'))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
