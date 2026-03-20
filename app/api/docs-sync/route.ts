import type { DocsSyncPayload } from '@/lib/docs-sync/types'

export async function POST() {
  try {
    const payload: DocsSyncPayload = {
      source: 'nextjs-app',
      eventType: 'feature-update',
      timestamp: new Date().toISOString(),
      feature: 'docs-sync',
      data: {
        message: 'Test from Next.js',
      },
    }

    const response = await fetch(process.env.CONFLUENCE_DOCS_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    return Response.json({
      ok: true,
      forgeResponse: data,
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: String(error) },
      { status: 500 }
    )
  }
}
