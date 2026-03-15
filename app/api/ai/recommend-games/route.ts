import "server-only"

import { NextResponse } from "next/server"
import { z } from "zod"

import openai from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase-admin"

const requestSchema = z.object({
  tournamentId: z.string().uuid(),
  userPrompt: z.string().min(1),
})

const recommendationSchema = z.object({
  gameId: z.string(),
  name: z.string(),
  fitScore: z.coerce.number(),
  reason: z.string().default(""),
  warning: z.string().optional().default(""),
})

const pickSchema = z.object({
  gameId: z.string(),
  name: z.string(),
  reason: z.string().default(""),
})

const aiResponseSchema = z.object({
  recommendations: z.array(recommendationSchema).default([]),
  safePick: pickSchema.nullable().optional().default(null),
  wildcardPick: pickSchema.nullable().optional().default(null),
})

function parseAiJson(text: string) {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error("AI response did not include JSON")
    }
    return JSON.parse(match[0])
  }
}

function extractErrorDetails(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      kind: "zod",
      issues: error.issues,
    }
  }

  if (error instanceof Error) {
    const maybe = error as Error & { status?: number; code?: string; type?: string }
    return {
      kind: "error",
      message: error.message,
      status: maybe.status,
      code: maybe.code,
      type: maybe.type,
    }
  }

  if (typeof error === "object" && error !== null) {
    return {
      kind: "object",
      ...error,
    }
  }

  return {
    kind: "unknown",
    value: String(error),
  }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const cleaned = value.trim()
      const parsed = Number(cleaned)
      if (Number.isFinite(parsed)) {
        return parsed
      }

      const numericToken = cleaned.match(/-?\d+(?:\.\d+)?/)
      if (!numericToken) {
        continue
      }

      const parsedToken = Number(numericToken[0])
      if (!Number.isFinite(parsedToken)) {
        continue
      }

      if (cleaned.includes("%") && parsedToken > 1) {
        return parsedToken / 100
      }
      if (cleaned.includes("/100") && parsedToken > 1 && parsedToken <= 100) {
        return parsedToken / 100
      }
      if (cleaned.includes("/10") && parsedToken > 1 && parsedToken <= 10) {
        return parsedToken / 10
      }

      return parsedToken
    }
  }

  return undefined
}

function normalizeFitScore(raw: Record<string, unknown>, fallbackScore: number) {
  const parsed = firstNumber(raw.fitScore, raw.fit_score, raw.score)
  if (typeof parsed === "number" && Number.isFinite(parsed)) {
    return parsed
  }

  return fallbackScore
}

function normalizePick(raw: unknown) {
  if (!raw || typeof raw !== "object") return null
  const source = raw as Record<string, unknown>

  const gameId = firstString(source.gameId, source.game_id, source.id)
  const name = firstString(source.name, source.gameName, source.game_name)
  if (!gameId || !name) {
    return null
  }

  return {
    gameId,
    name,
    reason: firstString(source.reason, source.why, source.explanation) ?? "",
  }
}

function normalizeRecommendation(rec: Record<string, unknown>, index: number, total: number) {
  const gameId = firstString(rec.gameId, rec.game_id, rec.id)
  const name = firstString(rec.name, rec.gameName, rec.game_name)
  if (!gameId || !name) {
    return null
  }

  const fallbackScore = Math.max(0.01, Number((1 - index / Math.max(total, 1)).toFixed(3)))

  return {
    gameId,
    name,
    fitScore: normalizeFitScore(rec, fallbackScore),
    reason: firstString(rec.reason, rec.why, rec.explanation) ?? "",
    warning: firstString(rec.warning, rec.note, rec.caveat) ?? "",
  }
}

function normalizeAiPayload(raw: unknown) {
  if (!raw || typeof raw !== "object") return raw
  const payload = raw as Record<string, unknown>

  const rawRecommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations
    : Array.isArray(payload.picks)
      ? payload.picks
      : []

  const recommendations = rawRecommendations
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const rec = item as Record<string, unknown>
      return normalizeRecommendation(rec, index, rawRecommendations.length)
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return {
    recommendations,
    safePick: normalizePick(payload.safePick ?? payload.safe_pick),
    wildcardPick: normalizePick(payload.wildcardPick ?? payload.wildcard_pick),
  }
}

function fallbackPick(
  recommendations: z.infer<typeof recommendationSchema>[],
  index: number,
  label: "safe" | "wildcard",
) {
  const fallback = recommendations[index] ?? recommendations[0]
  if (!fallback) return null

  return {
    gameId: fallback.gameId,
    name: fallback.name,
    reason: `Fallback ${label} pick derived from top recommendations. ${fallback.reason}`.trim(),
  }
}

export async function POST(request: Request) {
  let stage = "read_request"

  try {
    const json = await request.json()
    const parsedInput = requestSchema.safeParse(json)

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body",
          stage: "validate_request",
          details: parsedInput.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { tournamentId, userPrompt } = parsedInput.data

    stage = "load_players"
    const playersResult = await supabaseAdmin
      .from("tournament_players")
      .select("id")
      .eq("tournament_id", tournamentId)
      .is("left_at", null)

    if (playersResult.error) {
      throw playersResult.error
    }

    const playerCount = playersResult.data.length

    stage = "load_recent_plays"
    const recentPlaysResult = await supabaseAdmin
      .from("plays")
      .select("game_id")
      .eq("tournament_id", tournamentId)
      .order("played_at", { ascending: false })
      .limit(10)

    if (recentPlaysResult.error) {
      throw recentPlaysResult.error
    }

    const recentGameIds = Array.from(
      new Set(recentPlaysResult.data.map((play) => play.game_id).filter((id): id is string => Boolean(id))),
    )

    stage = "load_games"
    const gamesResult = await supabaseAdmin
      .from("games")
      .select("id,name,min_players,max_players,playtime_minutes,notes")
      .eq("is_active", true)
      .lte("min_players", playerCount)
      .gte("max_players", playerCount)

    if (gamesResult.error) {
      throw gamesResult.error
    }

    const games = gamesResult.data

    if (games.length === 0) {
      return NextResponse.json({
        recommendations: [],
        safePick: null,
        wildcardPick: null,
        meta: {
          playerCount,
          candidateCount: 0,
        },
      })
    }

    const gameIds = games.map((game) => game.id)

    stage = "load_game_tags"
    const gameTagsResult = await supabaseAdmin
      .from("game_tags")
      .select("game_id,tag_id")
      .in("game_id", gameIds)

    if (gameTagsResult.error) {
      throw gameTagsResult.error
    }

    const tagIds = Array.from(new Set(gameTagsResult.data.map((row) => row.tag_id)))

    const tagsById = new Map<string, string>()
    if (tagIds.length > 0) {
      stage = "load_tags"
      const tagsResult = await supabaseAdmin.from("tags").select("id,slug,label").in("id", tagIds)
      if (tagsResult.error) {
        throw tagsResult.error
      }

      for (const tag of tagsResult.data) {
        tagsById.set(tag.id, tag.label || tag.slug)
      }
    }

    const gameIdToTags = new Map<string, string[]>()
    for (const row of gameTagsResult.data) {
      const tagName = tagsById.get(row.tag_id)
      if (!tagName) continue
      const current = gameIdToTags.get(row.game_id) ?? []
      current.push(tagName)
      gameIdToTags.set(row.game_id, current)
    }

    const candidateGames = games.map((game) => ({
      id: game.id,
      name: game.name,
      minPlayers: game.min_players,
      maxPlayers: game.max_players,
      notes: game.notes,
      tags: gameIdToTags.get(game.id) ?? [],
    }))

    const allKnownTags = Array.from(
      new Set(candidateGames.flatMap((game) => game.tags.map((tag) => tag.trim()).filter(Boolean))),
    )

    stage = "openai_request"
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are a board game recommendation assistant. Return strict JSON only with keys: recommendations, safePick, wildcardPick.",
        },
        {
          role: "user",
          content: JSON.stringify({
            rules: [
              "Only recommend games from candidateGames.",
              "Prioritize player-count fit and semantic tag fit from the userPrompt.",
              "Infer intent from natural language and map it to the closest tags from allKnownTags.",
              "Prefer games that match more of the inferred tags.",
              "Explicitly mention the supporting tags in each reason.",
              "Avoid recently played games when possible.",
              "Return JSON only.",
              "If there are recommendations, always include safePick and wildcardPick.",
            ],
            userPrompt,
            playerCount,
            allKnownTags,
            recentGameIds,
            candidateGames,
          }),
        },
      ],
    })

    stage = "parse_ai_json"
    const outputText = response.output_text
    const aiJson = normalizeAiPayload(parseAiJson(outputText))

    stage = "validate_ai_json"
    const validated = aiResponseSchema.safeParse(aiJson)
    if (!validated.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI response schema mismatch",
          stage,
          details: validated.error.flatten(),
          meta: {
            playerCount,
            candidateCount: candidateGames.length,
            knownTagCount: allKnownTags.length,
          },
        },
        { status: 502 },
      )
    }

    const aiResult = validated.data
    const normalizedSafePick = aiResult.safePick ?? fallbackPick(aiResult.recommendations, 0, "safe")
    const normalizedWildcardPick = aiResult.wildcardPick ?? fallbackPick(aiResult.recommendations, 1, "wildcard")

    if (aiResult.recommendations.length > 0) {
      stage = "log_suggestions"
      const impressionRows = aiResult.recommendations.map((recommendation) => ({
        tournament_id: tournamentId,
        game_id: recommendation.gameId,
      }))

      const { error: insertError } = await supabaseAdmin.from("game_suggestion_events").insert(impressionRows)
      if (insertError) {
        console.error("Failed to log game suggestion events", insertError)
      }
    }

    return NextResponse.json({
      ...aiResult,
      safePick: normalizedSafePick,
      wildcardPick: normalizedWildcardPick,
      meta: {
        playerCount,
        candidateCount: candidateGames.length,
        knownTagCount: allKnownTags.length,
      },
    })
  } catch (error) {
    const details = extractErrorDetails(error)
    console.error("recommend-games route failed", { stage, details })

    return NextResponse.json(
      {
        ok: false,
        error: "Server failure",
        stage,
        details,
      },
      { status: 500 },
    )
  }
}
