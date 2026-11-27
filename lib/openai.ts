import OpenAI from "openai"

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  return apiKey ? new OpenAI({ apiKey }) : null
}
