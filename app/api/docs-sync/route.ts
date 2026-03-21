import { buildDocsSyncPayload } from '@/lib/docs-sync/buildPayload'

type DocsSyncRequestField =
  | 'source'
  | 'eventType'
  | 'timestamp'
  | 'feature'
  | 'system'
  | 'integration'
  | 'release'
  | 'incidentId'
  | 'summary'
  | 'message'

type DocsSyncRequestBody = Partial<Record<DocsSyncRequestField, string>>

const FALLBACK_SUMMARY = 'Testing Next.js to Forge to Confluence sync'
const FALLBACK_MESSAGE = 'This is a test sync sent from the Next.js API route.'
const SUPPORTED_STRING_FIELDS: DocsSyncRequestField[] = [
  'source',
  'eventType',
  'timestamp',
  'feature',
  'system',
  'integration',
  'release',
  'incidentId',
  'summary',
  'message',
]

export async function POST(request: Request) {
  const webhookUrl = process.env.CONFLUENCE_DOCS_WEBHOOK_URL

  if (!webhookUrl) {
    return Response.json(
      { ok: false, error: 'Missing CONFLUENCE_DOCS_WEBHOOK_URL' },
      { status: 500 }
    )
  }

  const requestBody = await parseDocsSyncRequestBody(request)
  const payload = buildDocsSyncPayload({
    source: requestBody.source,
    eventType: requestBody.eventType ?? 'feature-update',
    timestamp: requestBody.timestamp,
    feature: requestBody.feature,
    system: requestBody.system,
    integration: requestBody.integration,
    release: requestBody.release,
    incidentId: requestBody.incidentId,
    summary: requestBody.summary ?? FALLBACK_SUMMARY,
    message: requestBody.message ?? FALLBACK_MESSAGE,
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

async function parseDocsSyncRequestBody(request: Request): Promise<DocsSyncRequestBody> {
  const rawBody = await request.text()

  if (rawBody.trim().length === 0) {
    return {}
  }

  try {
    const parsedBody = JSON.parse(rawBody)

    if (!isPlainObject(parsedBody)) {
      return {}
    }

    return pickDefinedStrings(parsedBody, SUPPORTED_STRING_FIELDS)
  } catch {
    return {}
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickDefinedStrings<T extends string>(
  source: Record<string, unknown>,
  fields: readonly T[]
): Partial<Record<T, string>> {
  const pickedFields: Partial<Record<T, string>> = {}

  for (const field of fields) {
    const value = source[field]

    if (typeof value === 'string') {
      pickedFields[field] = value
    }
  }

  return pickedFields
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
