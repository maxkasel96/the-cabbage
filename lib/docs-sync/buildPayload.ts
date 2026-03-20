import type { DocsSyncEventType, DocsSyncPayload } from '@/lib/docs-sync/types'

type BuildDocsSyncPayloadOptions = {
  eventType: DocsSyncEventType
  feature: string
  data?: DocsSyncPayload['data']
}

export function buildDocsSyncPayload({
  eventType,
  feature,
  data = {},
}: BuildDocsSyncPayloadOptions): DocsSyncPayload {
  return {
    source: 'nextjs-app',
    eventType,
    timestamp: new Date().toISOString(),
    feature,
    data,
  }
}
