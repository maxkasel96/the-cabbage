export type DocsSyncEventType =
  | 'docs-sync-test'
  | 'feature-create'
  | 'feature-update'
  | 'feature-delete'
  | 'integration-create'
  | 'integration-update'
  | 'integration-delete'
  | 'release-update'
  | 'incident-update'
  | (string & {})

export type DocsSyncPageType =
  | 'feature-page'
  | 'integration-page'
  | 'release-page'
  | 'incident-page'

export type DocsSyncDetailFields = {
  summary?: string
  status?: string
  owner?: string
  owningArea?: string
  currentState?: string
  connectedSystem?: string
  notes?: string[]
  relatedFeatures?: string[]
  relatedIntegrations?: string[]
}

export type DocsSyncPayloadData = {
  pageType?: DocsSyncPageType
  seedKey?: string
  detail?: DocsSyncDetailFields
  [key: string]: unknown
}

export type DocsSyncPayload = {
  source: string
  eventType: DocsSyncEventType
  timestamp: string
  feature?: string
  system?: string
  integration?: string
  release?: string
  incidentId?: string
  pageType?: DocsSyncPageType
  summary: string
  message: string
  data?: DocsSyncPayloadData
}

export type FeatureDocSeed = {
  key: string
  name: string
  summary: string
  status: string
  owner?: string
  owningArea?: string
  currentState: string
  notes: string[]
  relatedIntegrations?: string[]
}

export type IntegrationDocSeed = {
  key: string
  name: string
  summary: string
  status: string
  connectedSystem: string
  owner?: string
  owningArea?: string
  currentState: string
  notes: string[]
  relatedFeatures?: string[]
}
