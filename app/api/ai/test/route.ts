import openai from "@/lib/openai"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: "Reply with exactly: OpenAI route is working.",
    })

    return NextResponse.json({ ok: true, output: response.output_text })
  } catch {
    return NextResponse.json({ ok: false, error: "OpenAI request failed" }, { status: 500 })
  }
}
