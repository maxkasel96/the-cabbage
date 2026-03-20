import type { DocsSyncEventType, DocsSyncPayload } from '@/lib/docs-sync/types'

type BuildDocsSyncPayloadOptions = {
  eventType: DocsSyncEventType
  feature: string
  summary: string
  message: string
  data?: Record<string, unknown>
}

export function buildDocsSyncPayload({
  eventType,
  feature,
  summary,
  message,
  data = {},
}: BuildDocsSyncPayloadOptions): DocsSyncPayload {
  return {
    source: 'nextjs-app',
    eventType: requireNonEmptyString('eventType', eventType),
    timestamp: new Date().toISOString(),
    feature: requireNonEmptyString('feature', feature),
    summary: requireNonEmptyString('summary', summary),
    message: requireNonEmptyString('message', message),
    data,
  }
}

function requireNonEmptyString(fieldName: string, value: string): string {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    throw new Error(`Missing required docs sync field: ${fieldName}`)
  }

  return trimmedValue
}
