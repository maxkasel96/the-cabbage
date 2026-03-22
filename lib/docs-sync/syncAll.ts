import { buildSeedDocsSyncPayloads } from './seedPayloads'
import { sendDocsSyncPayload } from './sendPayload'
import type { DocsSyncPayload, DocsSyncPageType } from './types'

export type DocsSyncSendResult = Awaited<ReturnType<typeof sendDocsSyncPayload>>

export type DocsSyncPayloadLog = {
  title: string
  pageType: DocsSyncPageType | 'unknown-page'
  ok: boolean
  status: number
  payload: DocsSyncPayload
  forgeResponse: DocsSyncSendResult['forgeResponse']
}

export type DocsSyncSummary = {
  totalAttempted: number
  totalSucceeded: number
  totalFailed: number
  results: DocsSyncPayloadLog[]
}

type SyncAllDocsPayloadsOptions = {
  webhookUrl?: string
  payloads?: DocsSyncPayload[]
  sender?: (payload: DocsSyncPayload, options?: { webhookUrl?: string }) => Promise<DocsSyncSendResult>
  onResult?: (result: DocsSyncPayloadLog) => void
}

export async function syncAllDocsPayloads(
  options: SyncAllDocsPayloadsOptions = {}
): Promise<DocsSyncSummary> {
  const payloads = options.payloads ?? buildSeedDocsSyncPayloads()
  const sender = options.sender ?? sendDocsSyncPayload
  const results: DocsSyncPayloadLog[] = []

  for (const payload of payloads) {
    const sendResult = await sender(payload, { webhookUrl: options.webhookUrl })
    const result: DocsSyncPayloadLog = {
      title: getPayloadTitle(payload),
      pageType: payload.pageType ?? payload.data?.pageType ?? 'unknown-page',
      ok: sendResult.ok,
      status: sendResult.status,
      payload,
      forgeResponse: sendResult.forgeResponse,
    }

    results.push(result)
    options.onResult?.(result)
  }

  return {
    totalAttempted: results.length,
    totalSucceeded: results.filter((result) => result.ok).length,
    totalFailed: results.filter((result) => !result.ok).length,
    results,
  }
}

function getPayloadTitle(payload: DocsSyncPayload): string {
  return (
    payload.title ??
    payload.feature ??
    payload.integration ??
    payload.runbook ??
    payload.externalId ??
    'Untitled docs payload'
  )
}
