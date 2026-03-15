"use client"

import { useState } from "react"

type RecommendationResponse = unknown

const REQUEST_BODY = {
  tournamentId: "00000000-0000-0000-0000-000000000000",
  desiredVibe: "chaotic and funny",
  maxDuration: 45,
}

export default function AiTestPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecommendationResponse | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/recommend-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(REQUEST_BODY),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult(null)
        setError(typeof data?.error === "string" ? data.error : "Request failed")
        return
      }

      setResult(data)
    } catch {
      setResult(null)
      setError("Network request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1>AI Recommendation Test</h1>
      <button onClick={handleClick} disabled={isLoading} style={{ marginTop: 12 }}>
        {isLoading ? "Loading..." : "Get AI Recommendations"}
      </button>

      {error ? (
        <p style={{ color: "crimson", marginTop: 16 }}>Error: {error}</p>
      ) : null}

      {result ? (
        <pre style={{ marginTop: 16, padding: 12, background: "#f5f5f5", overflowX: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </main>
  )
}
