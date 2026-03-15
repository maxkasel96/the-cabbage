import "server-only"

import { NextResponse } from "next/server"
import { z } from "zod"

import openai from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase-admin"

const requestSchema = z.object({
  tournamentId: z.string().uuid(),
  desiredVibe: z.string().min(1),
  maxDuration: z.number().int().positive().optional(),
})

const aiResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      gameId: z.string(),
      name: z.string(),
      fitScore: z.number(),
      reason: z.string(),
      warning: z.string().optional().default(""),
    }),
  ),
  safePick: z.object({
    gameId: z.string(),
    name: z.string(),
    reason: z.string(),
  }),
  wildcardPick: z.object({
    gameId: z.string(),
    name: z.string(),
    reason: z.string(),
  }),
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

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsedInput = requestSchema.safeParse(json)

    if (!parsedInput.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body", details: parsedInput.error.flatten() },
        { status: 400 },
      )
    }

    const { tournamentId, desiredVibe, maxDuration } = parsedInput.data

    const playersResult = await supabaseAdmin
      .from("tournament_players")
      .select("id")
      .eq("tournament_id", tournamentId)
      .is("left_at", null)

    if (playersResult.error) {
      throw playersResult.error
    }

    const playerCount = playersResult.data.length

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

    let gamesQuery = supabaseAdmin
      .from("games")
      .select("id,name,min_players,max_players,playtime_minutes,notes")
      .eq("is_active", true)
      .lte("min_players", playerCount)
      .gte("max_players", playerCount)

    if (typeof maxDuration === "number") {
      gamesQuery = gamesQuery.lte("playtime_minutes", maxDuration)
    }

    const gamesResult = await gamesQuery

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
      playtimeMinutes: game.playtime_minutes,
      notes: game.notes,
      tags: gameIdToTags.get(game.id) ?? [],
    }))

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
              "Prioritize player-count fit, duration fit, and vibe fit.",
              "Avoid recently played games when possible.",
              "Return JSON only.",
            ],
            desiredVibe,
            playerCount,
            maxDuration: maxDuration ?? null,
            recentGameIds,
            candidateGames,
          }),
        },
      ],
    })

    const outputText = response.output_text
    const aiJson = parseAiJson(outputText)
    const aiResult = aiResponseSchema.parse(aiJson)

    if (aiResult.recommendations.length > 0) {
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
      meta: {
        playerCount,
        candidateCount: candidateGames.length,
      },
    })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
    }

    return NextResponse.json({ ok: false, error: "Server failure" }, { status: 500 })
  }
}
