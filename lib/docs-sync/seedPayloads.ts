import { buildDocsSyncPayload } from './buildPayload'
import {
  buildFeatureDocContent,
  buildIntegrationDocContent,
  buildRunbookContent,
  buildRunbookExternalId,
  buildRunbookTitle,
  buildSeedDocumentExternalId,
} from './seedRendering'
import { featureDocSeeds, integrationDocSeeds, runbookDocSeeds } from './seedData'
import type { DocsSyncPayload, FeatureDocSeed, IntegrationDocSeed, RunbookDocSeed } from './types'

export function buildSeedDocsSyncPayloads(): DocsSyncPayload[] {
  return [
    ...featureDocSeeds.map(buildFeatureSeedPayload),
    ...integrationDocSeeds.map(buildIntegrationSeedPayload),
    ...runbookDocSeeds.map(buildRunbookSeedPayload),
  ]
}

export function buildFeatureSeedPayload(seed: FeatureDocSeed): DocsSyncPayload {
  return buildDocsSyncPayload({
    eventType: 'feature-update',
    pageType: 'feature-page',
    feature: seed.name,
    title: seed.name,
    externalId: buildSeedDocumentExternalId('feature-page', seed.key),
    summary: seed.summary,
    message: seed.currentState,
    content: buildFeatureDocContent(seed),
    data: {
      pageType: 'feature-page',
      seedKey: seed.key,
      detail: {
        summary: seed.summary,
        summaryDetails: seed.summaryDetails,
        status: seed.status,
        owner: seed.owner,
        owningArea: seed.owningArea,
        currentState: seed.currentState,
        notes: seed.notes,
        relatedIntegrations: seed.relatedIntegrations,
      },
    },
  })
}

export function buildIntegrationSeedPayload(seed: IntegrationDocSeed): DocsSyncPayload {
  return buildDocsSyncPayload({
    eventType: 'integration-update',
    pageType: 'integration-page',
    integration: seed.name,
    system: seed.connectedSystem,
    title: seed.name,
    externalId: buildSeedDocumentExternalId('integration-page', seed.key),
    summary: seed.summary,
    message: seed.currentState,
    content: buildIntegrationDocContent(seed),
    data: {
      pageType: 'integration-page',
      seedKey: seed.key,
      detail: {
        summary: seed.summary,
        summaryDetails: seed.summaryDetails,
        status: seed.status,
        owner: seed.owner,
        owningArea: seed.owningArea,
        connectedSystem: seed.connectedSystem,
        currentState: seed.currentState,
        notes: seed.notes,
        relatedFeatures: seed.relatedFeatures,
      },
    },
  })
}

export function buildRunbookSeedPayload(seed: RunbookDocSeed): DocsSyncPayload {
  return buildDocsSyncPayload({
    eventType: 'runbook-update',
    pageType: 'runbook-page',
    runbook: seed.name,
    title: buildRunbookTitle(seed.name),
    externalId: buildRunbookExternalId(seed.key),
    summary: seed.summary,
    message: seed.currentState,
    content: buildRunbookContent(seed),
    data: {
      pageType: 'runbook-page',
      seedKey: seed.key,
      detail: {
        summary: seed.summary,
        summaryDetails: seed.summaryDetails,
        status: seed.status,
        owner: seed.owner,
        owningArea: seed.owningArea,
        currentState: seed.currentState,
        notes: seed.notes,
      },
      prerequisites: seed.prerequisites,
      steps: seed.steps,
      runbookName: seed.name,
    },
  })
}
