import type { DocsSyncEventType, DocsSyncPayload } from '@/lib/docs-sync/types'

type BuildDocsSyncPayloadOptions = {
  source?: string
  timestamp?: string
  eventType: DocsSyncEventType
  feature?: string
  system?: string
  integration?: string
  release?: string
  incidentId?: string
  summary: string
  message: string
  data?: Record<string, unknown>
}

export function buildDocsSyncPayload({
  source,
  timestamp,
  eventType,
  feature,
  system,
  integration,
  release,
  incidentId,
  summary,
  message,
  data,
}: BuildDocsSyncPayloadOptions): DocsSyncPayload {
  return {
    source: getOptionalString(source) ?? 'nextjs-app',
    timestamp: getOptionalString(timestamp) ?? new Date().toISOString(),
    eventType: requireNonEmptyString('eventType', eventType),
    summary: requireNonEmptyString('summary', summary),
    message: requireNonEmptyString('message', message),
    ...getOptionalField('feature', feature),
    ...getOptionalField('system', system),
    ...getOptionalField('integration', integration),
    ...getOptionalField('release', release),
    ...getOptionalField('incidentId', incidentId),
    ...(data === undefined ? {} : { data }),
  }
}

function requireNonEmptyString<T extends string>(fieldName: string, value: T): T {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    throw new Error(`Missing required docs sync field: ${fieldName}`)
  }

  return trimmedValue as T
}

function getOptionalString(value?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function getOptionalField<T extends 'feature' | 'system' | 'integration' | 'release' | 'incidentId'>(
  fieldName: T,
  value?: string
): Partial<Pick<DocsSyncPayload, T>> {
  const trimmedValue = getOptionalString(value)

  return trimmedValue === undefined
    ? {}
    : ({ [fieldName]: trimmedValue } as Partial<Pick<DocsSyncPayload, T>>)
}
