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

type CandidateGame = {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  notes: string | null
  tags: string[]
}

function buildRecommendationSystemPrompt() {
  return [
    "You are a board game recommendation assistant.",
    "Your job is to interpret a messy natural-language request and match it to the best games from a provided candidate list.",
    "Think in four phases: (1) extract intent, (2) map intent to known tags, (3) rank candidate games, (4) write final user-facing copy.",
    "Keep phases 1-3 analytical and grounded in the provided data.",
    "Apply the crass, irreverent, inappropriate-but-non-hateful comedic tone only when writing the final user-facing reason and warning fields.",
    "Return strict JSON only with keys: recommendations, safePick, wildcardPick.",
  ].join(" ")
}

function buildRecommendationUserPayload(params: {
  userPrompt: string
  playerCount: number
  allKnownTags: string[]
  recentGameIds: string[]
  candidateGames: CandidateGame[]
}) {
  const { userPrompt, playerCount, allKnownTags, recentGameIds, candidateGames } = params

  return {
    task: "Recommend board games from candidateGames for the current group.",
    userPrompt,
    context: {
      playerCount,
      recentGameIds,
      allKnownTags,
      candidateGames,
    },
    instructions: {
      hardConstraints: [
        "Only recommend games from candidateGames.",
        "Treat candidateGames as already filtered for player-count compatibility; do not invent any game outside that set.",
        "If candidateGames is empty, return no recommendations.",
      ],
      preferenceFramework: {
        strongPreferences: [
          "Infer what the user explicitly wants: vibe, energy level, complexity, social dynamics, competitiveness, cooperation, conflict, and pacing.",
          "Map the user's language to the closest tags from allKnownTags, even when the wording is indirect or slangy.",
          "Prefer games that satisfy more strong preferences and better semantic tag overlap.",
        ],
        softPreferences: [
          "Use game notes to break ties when they reinforce the user's vibe.",
          "Avoid recently played games when a similarly strong alternative exists.",
          "Reserve wildcardPick for a plausible but slightly bolder fit than the safest top pick.",
        ],
      },
      requiredReasoningSteps: [
        "Step 1: extract hard constraints, strong preferences, soft preferences, and explicit dislikes from userPrompt.",
        "Step 2: map the extracted intent to the closest tags from allKnownTags.",
        "Step 3: rank candidateGames by overall fit, considering semantic tag match, vibe match, and freshness versus recentGameIds.",
        "Step 4: write concise final reasons and warnings for the chosen games only.",
      ],
      outputRules: [
        "recommendations must be ordered best fit first.",
        "If there are recommendations, always include safePick and wildcardPick.",
        "safePick should be the most broadly reliable option.",
        "wildcardPick should still be defensible, but may be a more surprising choice.",
        "Do not mention inferred tags, tag names, supporting tags, ranking mechanics, or player count in any reason or warning.",
        "Do not mention numeric player ranges or say that player count fits.",
        "Keep every reason concise, punchy, and written in a crass, irreverent, inappropriate-but-non-hateful comedic tone.",
        "Warnings should only mention meaningful tradeoffs or caveats, not internal matching logic.",
        "Return JSON only.",
      ],
    },
    outputContract: {
      recommendations: [
        {
          gameId: "string",
          name: "string",
          fitScore: "number from 0 to 1",
          reason: "string",
          warning: "string",
        },
      ],
      safePick: {
        gameId: "string",
        name: "string",
        reason: "string",
      },
      wildcardPick: {
        gameId: "string",
        name: "string",
        reason: "string",
      },
    },
  }
}

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

function sanitizeRecommendationCopy(text: string) {
  const compact = text.replace(/\s+/g, " ").trim()
  if (!compact) return ""

  const sentencePattern = /[^.!?]+[.!?]?/g
  const sentences = compact.match(sentencePattern) ?? [compact]
  const filtered = sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => {
      const normalized = sentence.toLowerCase()

      if (normalized.includes("inferred tag")) return false
      if (normalized.includes("supporting tag")) return false
      if (normalized.includes("tag fit")) return false
      if (normalized.includes("matches inferred")) return false
      if (normalized.includes("player count")) return false
      if (/\b\d+\s*[-–]\s*\d+\b/.test(sentence) && normalized.includes("fit")) return false
      if (/\b\d+\s*player\b/i.test(sentence) || /\b\d+\s*players\b/i.test(sentence)) return false

      return true
    })

  return filtered.join(" ").trim()
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
    reason: sanitizeRecommendationCopy(firstString(source.reason, source.why, source.explanation) ?? ""),
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
    reason: sanitizeRecommendationCopy(firstString(rec.reason, rec.why, rec.explanation) ?? ""),
    warning: sanitizeRecommendationCopy(firstString(rec.warning, rec.note, rec.caveat) ?? ""),
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
          content: buildRecommendationSystemPrompt(),
        },
        {
          role: "user",
          content: JSON.stringify(
            buildRecommendationUserPayload({
              userPrompt,
              playerCount,
              allKnownTags,
              recentGameIds,
              candidateGames,
            }),
          ),
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
