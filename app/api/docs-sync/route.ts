import { buildDocsSyncPayload } from '@/lib/docs-sync/buildPayload'
import { sendDocsSyncPayload } from '@/lib/docs-sync/sendPayload'
import type { DocsSyncPayloadData, DocsSyncPageType } from '@/lib/docs-sync/types'

type DocsSyncRequestField =
  | 'source'
  | 'eventType'
  | 'timestamp'
  | 'feature'
  | 'system'
  | 'integration'
  | 'release'
  | 'incidentId'
  | 'pageType'
  | 'summary'
  | 'message'

type DocsSyncRequestBody = Partial<Record<DocsSyncRequestField, string>> & {
  data?: DocsSyncPayloadData
}

const FALLBACK_SUMMARY = 'Testing Next.js to Forge to Confluence sync'
const FALLBACK_MESSAGE = 'This is a test sync sent from the Next.js API route.'
const FALLBACK_FEATURE = 'Docs sync test'
const SUPPORTED_STRING_FIELDS: DocsSyncRequestField[] = [
  'source',
  'eventType',
  'timestamp',
  'feature',
  'system',
  'integration',
  'release',
  'incidentId',
  'pageType',
  'summary',
  'message',
]

export async function POST(request: Request) {
  try {
    const requestBody = await parseDocsSyncRequestBody(request)
    const payload = buildDocsSyncPayload({
      source: requestBody.source,
      eventType: requestBody.eventType ?? 'feature-update',
      timestamp: requestBody.timestamp,
      feature: requestBody.feature ?? (!requestBody.integration ? FALLBACK_FEATURE : undefined),
      system: requestBody.system,
      integration: requestBody.integration,
      release: requestBody.release,
      incidentId: requestBody.incidentId,
      pageType:
        (requestBody.pageType as DocsSyncPageType | undefined) ??
        (requestBody.integration ? 'integration-page' : 'feature-page'),
      summary: requestBody.summary ?? FALLBACK_SUMMARY,
      message: requestBody.message ?? FALLBACK_MESSAGE,
      data: requestBody.data,
    })

    const forgeResult = await sendDocsSyncPayload(payload)

    if (!forgeResult.ok) {
      return Response.json(
        {
          ok: false,
          error: 'Forge webhook request failed',
          status: forgeResult.status,
          forgeResponse: forgeResult.forgeResponse,
        },
        { status: forgeResult.status }
      )
    }

    return Response.json({
      ok: true,
      status: forgeResult.status,
      forgeResponse: forgeResult.forgeResponse,
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

    return {
      ...pickDefinedStrings(parsedBody, SUPPORTED_STRING_FIELDS),
      ...(isPlainObject(parsedBody.data) ? { data: parsedBody.data as DocsSyncPayloadData } : {}),
    }
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
