export type DocsSyncEventType =
  | 'docs-sync-test'
  | 'feature-create'
  | 'feature-update'
  | 'feature-delete'
  | 'integration-create'
  | 'integration-update'
  | 'integration-delete'
  | 'runbook-update'
  | 'release-update'
  | 'incident-update'
  | (string & {})

export type DocsSyncPageType =
  | 'feature-page'
  | 'integration-page'
  | 'runbook-page'
  | 'release-page'
  | 'incident-page'

export type DocsSummaryDetails = {
  what?: string
  whyItExists?: string
  whoUsesIt?: string[]
  flow?: string[]
  dependencies?: string[]
  inputsAndOutputs?: string[]
  expectedBehavior?: string[]
  failurePointsAndRisks?: string[]
  operationalConsiderations?: string[]
  limitationsAndFutureImprovements?: string[]
}

export type DocsSyncDetailFields = {
  summary?: string
  summaryDetails?: DocsSummaryDetails
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
  runbook?: string
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

export type FeatureDocSeed = {
  key: string
  name: string
  summary: string
  summaryDetails: DocsSummaryDetails
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
  summaryDetails: DocsSummaryDetails
  status: string
  connectedSystem: string
  owner?: string
  owningArea?: string
  currentState: string
  notes: string[]
  relatedFeatures?: string[]
}

export type RunbookDocSeed = {
  key: string
  name: string
  summary: string
  summaryDetails: DocsSummaryDetails
  status: string
  owner?: string
  owningArea?: string
  currentState: string
  notes: string[]
  prerequisites?: string[]
  steps: string[]
}
