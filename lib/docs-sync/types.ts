export type DocsSyncEventType =
  | 'feature-update'
  | 'page-update'
  | 'deployment-update'
  | 'manual-sync'

export type DocsSyncPayload = {
  source: string
  eventType: DocsSyncEventType
  timestamp: string
  feature: string
  data: {
    message?: string
    pageId?: string
    title?: string
    content?: string
    [key: string]: unknown
  }
}
