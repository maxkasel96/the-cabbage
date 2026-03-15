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

type TroubleshootingPack = {
  title: string
  why: string
  checklist: string[]
  chatPrompt: string
}

const DEFAULT_VIBE = "chaotic and funny"
const DEFAULT_DURATION = 45

function buildPingTroubleshooting(state: ApiState): TroubleshootingPack {
  const errorText = state.error?.toLowerCase() ?? ""
  const has429 = errorText.includes("429") || errorText.includes("quota")
  const hasAuth = errorText.includes("401") || errorText.includes("403") || errorText.includes("auth")
  const hasMissingKey = errorText.includes("missing openai_api_key") || errorText.includes("openai_api_key")

  const checklist = [
    "Validate server env wiring in `lib/openai.ts` and verify `OPENAI_API_KEY` is present in the runtime where `/api/ai/test` executes.",
    "Inspect `/api/ai/test` error payload (`error`, `hint`, HTTP status) and include it verbatim in your troubleshooting thread.",
    "Confirm model access for `gpt-5-mini` in the same OpenAI project tied to the API key.",
  ]

  let title = "Connectivity troubleshooting"
  let why = "Use this when `/api/ai/test` fails so ChatGPT can diagnose configuration vs quota vs auth problems quickly."

  if (has429) {
    title = "Quota or rate-limit troubleshooting (429)"
    why = "The API reported a quota/rate issue. Most fixes involve project selection, billing limits, or usage caps."
    checklist.unshift(
      "Cross-check OpenAI org/project used by your key against the project with active billing and available budget.",
      "Capture timestamp + timezone + request frequency for the failing ping to separate quota exhaustion from burst rate limits.",
    )
  }

  if (hasAuth) {
    title = "Authentication/authorization troubleshooting"
    why = "The failure points to key permissions or model access restrictions."
    checklist.unshift(
      "Rotate the API key in the intended OpenAI project and update deployment secrets before retesting `/api/ai/test`.",
    )
  }

  if (hasMissingKey) {
    title = "Missing environment variable troubleshooting"
    why = "The route explicitly checks for `OPENAI_API_KEY`; this indicates runtime env configuration drift."
    checklist.unshift(
      "Set `OPENAI_API_KEY` in the server environment (not only local shell) and restart/redeploy so Next.js route handlers can read it.",
    )
  }

  const statusSummary = state.error
    ? `Observed error: ${state.error}`
    : "Observed outcome: request succeeded; use this to preempt future failures."

  const chatPrompt = [
    "Help me troubleshoot my OpenAI connectivity check in a Next.js app.",
    statusSummary,
    "Related code paths:",
    "- app/ai-test/page.tsx (client trigger + rendered error/output)",
    "- app/api/ai/test/route.ts (OpenAI ping route + status/hint mapping)",
    "- lib/openai.ts (OpenAI client + OPENAI_API_KEY wiring)",
    "Please give me a prioritized checklist to isolate env misconfiguration, model access, and quota/billing issues.",
  ].join("\n")

  return { title, why, checklist, chatPrompt }
}

function buildRecommendTroubleshooting(state: ApiState): TroubleshootingPack {
  const errorText = state.error?.toLowerCase() ?? ""
  const hasValidation = errorText.includes("invalid request body")
  const hasServerFailure = errorText.includes("server failure")

  const checklist = [
    "Verify request payload shape sent from `app/ai-test/page.tsx` to `/api/ai/recommend-games` (`tournamentId`, `desiredVibe`, optional numeric `maxDuration`).",
    "Confirm Supabase reads succeed for tournament players, recent plays, games, and tags in `app/api/ai/recommend-games/route.ts`.",
    "Capture API response JSON and status code from `/api/ai/recommend-games` to distinguish validation, data, and AI parsing failures.",
    "If AI output parsing fails, inspect JSON extraction constraints in `parseAiJson` and schema validation in `aiResponseSchema`.",
  ]

  let title = "Recommendation workflow troubleshooting"
  let why = "Use this when model-backed recommendation tests fail so investigation covers both data and OpenAI response parsing."

  if (hasValidation) {
    title = "Input validation troubleshooting"
    why = "The request body failed route validation before hitting core recommendation logic."
    checklist.unshift(
      "Ensure `selectedTournamentId` is a UUID and `maxDuration` parses to a positive integer when provided.",
    )
  }

  if (hasServerFailure) {
    title = "Server failure troubleshooting"
    why = "The route returned a generic server failure, which may mask Supabase errors or OpenAI/JSON parsing issues."
    checklist.unshift(
      "Check server logs around `app/api/ai/recommend-games/route.ts` for thrown Supabase/OpenAI errors before generic 500 handling.",
    )
  }

  const statusSummary = state.error
    ? `Observed error: ${state.error}`
    : "Observed outcome: request succeeded; use this to harden diagnostics and reliability."

  const chatPrompt = [
    "Help me debug a failing recommendation workflow in my Next.js app.",
    statusSummary,
    "Related code paths:",
    "- app/ai-test/page.tsx (form inputs + API request body)",
    "- app/api/ai/recommend-games/route.ts (zod validation, Supabase queries, OpenAI call, JSON parsing)",
    "- lib/openai.ts and lib/supabase-admin.ts (service clients/config)",
    "Please provide step-by-step checks to isolate validation errors, data query issues, and model response parsing failures.",
  ].join("\n")

  return { title, why, checklist, chatPrompt }
}

function TroubleshootingPanel({ pack }: { pack: TroubleshootingPack }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 8,
        border: "1px solid #d5dbc8",
        background: "#f2f5ea",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{pack.title}</h3>
      <p style={{ margin: "0 0 8px", color: "#34422f" }}>{pack.why}</p>
      <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
        {pack.checklist.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ul>
      <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Prompt starter for ChatGPT</p>
      <pre style={{ marginTop: 0, padding: 10, background: "#ffffff", overflowX: "auto", fontSize: 12 }}>
        {pack.chatPrompt}
      </pre>
    </div>
  )
}

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

  const pingTroubleshooting = useMemo(() => buildPingTroubleshooting(pingState), [pingState])
  const recommendTroubleshooting = useMemo(
    () => buildRecommendTroubleshooting(recommendState),
    [recommendState],
  )

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
        <TroubleshootingPanel pack={pingTroubleshooting} />
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
        <TroubleshootingPanel pack={recommendTroubleshooting} />
      </section>
    </main>
  )
}
