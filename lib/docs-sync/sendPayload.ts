import { buildDocsSyncPayload } from '@/lib/docs-sync/buildPayload'
import type { DocsSyncPayload } from '@/lib/docs-sync/types'

type SendDocsSyncPayloadOptions = {
  webhookUrl?: string
}

export async function sendDocsSyncPayload(
  payloadInput: DocsSyncPayload,
  options: SendDocsSyncPayloadOptions = {}
) {
  const webhookUrl = options.webhookUrl ?? process.env.CONFLUENCE_DOCS_WEBHOOK_URL

  if (!webhookUrl) {
    throw new Error('Missing CONFLUENCE_DOCS_WEBHOOK_URL')
  }

  const payload = buildDocsSyncPayload(payloadInput)
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const forgeResponse = await parseForgeResponse(response)

  return {
    ok: response.ok,
    status: response.status,
    forgeResponse,
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
