import { buildDocsSyncPayload } from '@/lib/docs-sync/buildPayload'

export async function POST() {
  const webhookUrl = process.env.CONFLUENCE_DOCS_WEBHOOK_URL

  if (!webhookUrl) {
    return Response.json(
      { ok: false, error: 'Missing CONFLUENCE_DOCS_WEBHOOK_URL' },
      { status: 500 }
    )
  }

  const payload = buildDocsSyncPayload({
    // The deployed Forge validation currently only accepts `feature-update`.
    eventType: 'feature-update',
    feature: 'docs-sync',
    summary: 'Testing Next.js to Forge to Confluence sync',
    message: 'This is a test sync sent from the Next.js API route.',
  })

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const forgeResponse = await parseForgeResponse(response)

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: 'Forge webhook request failed',
          status: response.status,
          forgeResponse,
        },
        { status: response.status }
      )
    }

    return Response.json({
      ok: true,
      status: response.status,
      forgeResponse,
    })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to reach Forge webhook',
      },
      { status: 500 }
    )
  }
}

async function parseForgeResponse(response: Response) {
  const contentType = response.headers.get('content-type')
  const responseText = await response.text()

  if (responseText.length === 0) {
    return null
  }

  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(responseText)
    } catch {
      return { raw: responseText }
    }
  }

  return { raw: responseText }
}
