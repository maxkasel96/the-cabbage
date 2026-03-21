import { buildDocsSyncPayload } from '@/lib/docs-sync/buildPayload'
import { featureDocSeeds, integrationDocSeeds } from '@/lib/docs-sync/seedData'
import type { DocsSyncPayload, FeatureDocSeed, IntegrationDocSeed } from '@/lib/docs-sync/types'

export function buildSeedDocsSyncPayloads(): DocsSyncPayload[] {
  return [
    ...featureDocSeeds.map(buildFeatureSeedPayload),
    ...integrationDocSeeds.map(buildIntegrationSeedPayload),
  ]
}

export function buildFeatureSeedPayload(seed: FeatureDocSeed): DocsSyncPayload {
  return buildDocsSyncPayload({
    eventType: 'feature-update',
    pageType: 'feature-page',
    feature: seed.name,
    summary: seed.summary,
    message: seed.currentState,
    data: {
      pageType: 'feature-page',
      seedKey: seed.key,
      detail: {
        summary: seed.summary,
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
    summary: seed.summary,
    message: seed.currentState,
    data: {
      pageType: 'integration-page',
      seedKey: seed.key,
      detail: {
        summary: seed.summary,
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
