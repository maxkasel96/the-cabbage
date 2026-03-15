"use client"

import { useEffect, useMemo, useState } from "react"

type Tournament = {
  id: string
  label: string | null
  year_start: number | null
  year_end: number | null
  is_active: boolean | null
}

type ApiState = {
  loading: boolean
  error: string | null
  result: unknown | null
}

const DEFAULT_VIBE = "chaotic and funny"
const DEFAULT_DURATION = 45

export default function AiTestPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const [desiredVibe, setDesiredVibe] = useState(DEFAULT_VIBE)
  const [maxDuration, setMaxDuration] = useState(String(DEFAULT_DURATION))

  const [pingState, setPingState] = useState<ApiState>({
    loading: false,
    error: null,
    result: null,
  })
  const [recommendState, setRecommendState] = useState<ApiState>({
    loading: false,
    error: null,
    result: null,
  })

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  )

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await fetch("/api/tournaments")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to fetch tournaments")
        }

        const rows = Array.isArray(data?.tournaments) ? (data.tournaments as Tournament[]) : []
        setTournaments(rows)

        const activeTournament = rows.find((row) => row.is_active)
        if (activeTournament) {
          setSelectedTournamentId(activeTournament.id)
        } else if (rows[0]) {
          setSelectedTournamentId(rows[0].id)
        }
      } catch (error) {
        setRecommendState({
          loading: false,
          result: null,
          error: error instanceof Error ? error.message : "Failed to load tournaments",
        })
      }
    }

    void loadTournaments()
  }, [])

  const runPing = async () => {
    setPingState({ loading: true, error: null, result: null })

    try {
      const response = await fetch("/api/ai/test")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "OpenAI ping failed")
      }

      setPingState({ loading: false, error: null, result: data })
    } catch (error) {
      setPingState({
        loading: false,
        result: null,
        error: error instanceof Error ? error.message : "OpenAI ping failed",
      })
    }
  }

  const runRecommendations = async () => {
    if (!selectedTournamentId) {
      setRecommendState({ loading: false, result: null, error: "Select a tournament first." })
      return
    }

    const parsedMaxDuration = Number(maxDuration)
    const hasDuration = Number.isFinite(parsedMaxDuration) && parsedMaxDuration > 0

    const requestBody = {
      tournamentId: selectedTournamentId,
      desiredVibe,
      ...(hasDuration ? { maxDuration: parsedMaxDuration } : {}),
    }

    setRecommendState({ loading: true, error: null, result: null })

    try {
      const response = await fetch("/api/ai/recommend-games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Recommendation request failed")
      }

      setRecommendState({ loading: false, error: null, result: data })
    } catch (error) {
      setRecommendState({
        loading: false,
        result: null,
        error: error instanceof Error ? error.message : "Recommendation request failed",
      })
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px 40px" }}>
      <h1>OpenAI Integration Demo</h1>
      <p>
        Use this page to verify your current OpenAI wiring before integrating AI results into existing product
        flows.
      </p>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>1) Connectivity check</h2>
        <p>Calls <code>/api/ai/test</code> and confirms the model can return a response.</p>
        <button onClick={runPing} disabled={pingState.loading}>
          {pingState.loading ? "Checking..." : "Run OpenAI Ping"}
        </button>
        {pingState.error ? <p style={{ color: "crimson" }}>Error: {pingState.error}</p> : null}
        {pingState.result ? (
          <pre style={{ marginTop: 12, padding: 12, background: "#f5f5f5", overflowX: "auto" }}>
            {JSON.stringify(pingState.result, null, 2)}
          </pre>
        ) : null}
      </section>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>2) Recommendation workflow check</h2>
        <p>
          Calls <code>/api/ai/recommend-games</code> using real tournaments and returns model-picked games plus
          metadata.
        </p>

        <label style={{ display: "block", marginBottom: 8 }}>
          Tournament
          <select
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          >
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.label ?? "Untitled tournament"}
                {tournament.year_start ? ` (${tournament.year_start}${tournament.year_end ? `-${tournament.year_end}` : ""})` : ""}
                {tournament.is_active ? " • active" : ""}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Desired vibe
          <input
            value={desiredVibe}
            onChange={(event) => setDesiredVibe(event.target.value)}
            placeholder="cozy strategy"
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Max duration in minutes (optional)
          <input
            value={maxDuration}
            onChange={(event) => setMaxDuration(event.target.value)}
            placeholder="45"
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>

        {selectedTournament ? (
          <p style={{ fontSize: 14, color: "#555" }}>
            Selected: {selectedTournament.label ?? selectedTournament.id}
          </p>
        ) : null}

        <button onClick={runRecommendations} disabled={recommendState.loading}>
          {recommendState.loading ? "Loading recommendations..." : "Run Recommendation Test"}
        </button>

        {recommendState.error ? <p style={{ color: "crimson" }}>Error: {recommendState.error}</p> : null}
        {recommendState.result ? (
          <pre style={{ marginTop: 12, padding: 12, background: "#f5f5f5", overflowX: "auto" }}>
            {JSON.stringify(recommendState.result, null, 2)}
          </pre>
        ) : null}
      </section>
    </main>
  )
}
