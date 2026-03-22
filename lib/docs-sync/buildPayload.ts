import type {
  DocsSyncEventType,
  DocsSyncPageType,
  DocsSyncPayload,
  DocsSyncPayloadData,
} from './types'

type BuildDocsSyncPayloadOptions = {
  source?: string
  timestamp?: string
  eventType: DocsSyncEventType
  feature?: string
  system?: string
  integration?: string
  release?: string
  incidentId?: string
  pageType?: DocsSyncPageType
  title?: string
  externalId?: string
  summary: string
  message: string
  content?: string
  data?: DocsSyncPayloadData
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
  pageType,
  title,
  externalId,
  summary,
  message,
  content,
  data,
}: BuildDocsSyncPayloadOptions): DocsSyncPayload {
  const normalizedPageType = getOptionalPageType(pageType)
  const normalizedData = normalizePayloadData(data, normalizedPageType)

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
    ...getOptionalField('title', title),
    ...getOptionalField('externalId', externalId),
    ...(normalizedPageType === undefined ? {} : { pageType: normalizedPageType }),
    ...getOptionalField('content', content),
    ...(normalizedData === undefined ? {} : { data: normalizedData }),
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

function getOptionalField<
  T extends 'feature' | 'system' | 'integration' | 'release' | 'incidentId' | 'title' | 'externalId' | 'content'
>(fieldName: T, value?: string): Partial<Pick<DocsSyncPayload, T>> {
  const trimmedValue = getOptionalString(value)

  return trimmedValue === undefined
    ? {}
    : ({ [fieldName]: trimmedValue } as Partial<Pick<DocsSyncPayload, T>>)
}

function normalizePayloadData(
  data: DocsSyncPayloadData | undefined,
  pageType: DocsSyncPageType | undefined
): DocsSyncPayloadData | undefined {
  if (data === undefined && pageType === undefined) {
    return undefined
  }

  const normalizedData: DocsSyncPayloadData = {
    ...(data ?? {}),
  }

  if (pageType !== undefined && normalizedData.pageType === undefined) {
    normalizedData.pageType = pageType
  }

  return normalizedData
}

function getOptionalPageType(value?: DocsSyncPageType): DocsSyncPageType | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  return value
}
