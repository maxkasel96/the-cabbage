export type DocsSyncEventType =
  | 'docs-sync-test'
  | 'feature-create'
  | 'feature-update'
  | 'feature-delete'
  | (string & {})

export type DocsSyncPayload = {
  source: string
  eventType: DocsSyncEventType
  timestamp: string
  feature?: string
  system?: string
  integration?: string
  release?: string
  incidentId?: string
  summary: string
  message: string
  data?: Record<string, unknown>
}
