declare const process: {
  env: Record<string, string | undefined>
}

import { buildDocsSyncPayload } from './buildPayload'
import type { DocsSyncPayload } from './types'

const DEBUG_PAGE_TITLE = 'Player logins and profiles'

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

  if (getPayloadTitle(payload) === DEBUG_PAGE_TITLE) {
    console.log(`[docs:sync debug] Outbound payload for ${DEBUG_PAGE_TITLE}`)
    console.log(JSON.stringify(payload, null, 2))
  }

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

function getPayloadTitle(payload: DocsSyncPayload): string | undefined {
  return payload.title ?? payload.feature ?? payload.integration ?? payload.runbook
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
