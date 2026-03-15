import openai from "@/lib/openai"
import { NextResponse } from "next/server"

const MODEL = "gpt-5-mini"

export async function GET() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing OPENAI_API_KEY",
        hint: "Set OPENAI_API_KEY in your server environment before testing /api/ai/test.",
      },
      { status: 500 },
    )
  }

  try {
    const response = await openai.responses.create({
      model: MODEL,
      input: "Reply with exactly: OpenAI route is working.",
    })

    return NextResponse.json({ ok: true, output: response.output_text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "OpenAI request failed"
    const status =
      typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const hint =
      status === 401 || status === 403
        ? "Authentication/authorization issue. Verify OPENAI_API_KEY, project permissions, and model access."
        : status === 429
          ? "Rate limit hit. Retry shortly or check your account limits."
          : "Check server logs and OpenAI API configuration."

    return NextResponse.json({ ok: false, error: message, hint }, { status })
  }
}
