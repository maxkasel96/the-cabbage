export async function POST() {
  try {
    const response = await fetch(process.env.CONFLUENCE_DOCS_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'nextjs-app',
        eventType: 'feature-update',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Test from Next.js',
        },
      }),
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
