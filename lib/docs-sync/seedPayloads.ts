import { discoverFeatures, type FeatureDiscoveryCandidate } from './discover/discoverFeatures'
import { discoverIntegrations, type IntegrationDiscoveryCandidate } from './discover/discoverIntegrations'
import { discoverRunbooks, type RunbookDiscoveryCandidate } from './discover/discoverRunbooks'
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

export type DocsDiscoverySummary = {
  features: FeatureDiscoveryCandidate[]
  integrations: IntegrationDiscoveryCandidate[]
  runbooks: RunbookDiscoveryCandidate[]
}

export type DocsSeedInventory = {
  features: FeatureDocSeed[]
  integrations: IntegrationDocSeed[]
  runbooks: RunbookDocSeed[]
  payloads: DocsSyncPayload[]
  discovery: DocsDiscoverySummary
}

export function buildDocsSeedInventory(): DocsSeedInventory {
  const discovery = {
    features: discoverFeatures(),
    integrations: discoverIntegrations(),
    runbooks: discoverRunbooks(),
  }
  const features = mergeDiscoveredFeatureSeeds(featureDocSeeds, discovery.features)
  const integrations = mergeDiscoveredIntegrationSeeds(integrationDocSeeds, discovery.integrations)
  const runbooks = mergeDiscoveredRunbookSeeds(runbookDocSeeds, discovery.runbooks)

  return {
    features,
    integrations,
    runbooks,
    payloads: [
      ...features.map(buildFeatureSeedPayload),
      ...integrations.map(buildIntegrationSeedPayload),
      ...runbooks.map(buildRunbookSeedPayload),
    ],
    discovery,
  }
}

export function buildSeedDocsSyncPayloads(): DocsSyncPayload[] {
  return buildDocsSeedInventory().payloads
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
      sourceFiles: seed.sourceFiles,
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
      sourceFiles: seed.sourceFiles,
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
      sourceFiles: seed.sourceFiles,
    },
  })
}

function mergeDiscoveredFeatureSeeds(
  existingSeeds: FeatureDocSeed[],
  discoveredCandidates: FeatureDiscoveryCandidate[]
): FeatureDocSeed[] {
  const mergedSeeds = [...existingSeeds]
  const seenKeys = new Set(existingSeeds.map((seed) => seed.key))
  const seenNames = new Set(existingSeeds.map((seed) => seed.name.toLowerCase()))

  for (const candidate of discoveredCandidates) {
    if (seenKeys.has(candidate.key) || seenNames.has(candidate.title.toLowerCase())) {
      continue
    }

    mergedSeeds.push({
      key: candidate.key,
      name: candidate.title,
      summary: buildFeatureSummary(candidate),
      summaryDetails: {
        what: `A discovered feature candidate centered on ${candidate.pageRoutes.join(', ')}.`,
        whyItExists: candidate.descriptionHints[0],
        flow: candidate.relatedApiRoutes.length > 0
          ? [
              `Users enter the ${candidate.title} workflow through ${candidate.pageRoutes.join(', ')}.`,
              `The page calls ${candidate.relatedApiRoutes.join(', ')} to load or mutate workflow data.`,
              'UI state and nearby components coordinate the rest of the user-facing experience.',
            ]
          : [`Users enter the ${candidate.title} workflow through ${candidate.pageRoutes.join(', ')}.`],
        dependencies: buildFeatureDependencies(candidate),
        expectedBehavior: [
          'Render the page route consistently for the intended user workflow.',
          candidate.relatedApiRoutes.length > 0
            ? 'Keep related API calls aligned with the page workflow.'
            : 'Keep the local UI workflow stable and understandable.',
        ],
        limitationsAndFutureImprovements: [
          'This page was discovered heuristically from code structure rather than curated manually.',
          'TODO: Refine feature grouping if multiple routes should collapse into a single Confluence page.',
        ],
      },
      status: 'Discovered',
      owningArea: inferOwningArea(candidate.title),
      currentState: `Discovered from ${candidate.pageRoutes.join(', ')} with ${candidate.sourceFiles.length} related source files.`,
      notes: [
        ...candidate.descriptionHints,
        `Workflow signals: ${candidate.metadata.workflowSignals.join(', ') || 'route scan only'}.`,
      ],
      relatedIntegrations: buildFeatureRelatedIntegrations(candidate),
      sourceFiles: candidate.sourceFiles,
    })
  }

  return mergedSeeds
}

function mergeDiscoveredIntegrationSeeds(
  existingSeeds: IntegrationDocSeed[],
  discoveredCandidates: IntegrationDiscoveryCandidate[]
): IntegrationDocSeed[] {
  const mergedSeeds = [...existingSeeds]
  const seenKeys = new Set(existingSeeds.map((seed) => seed.key))
  const seenNames = new Set(existingSeeds.map((seed) => seed.name.toLowerCase()))

  for (const candidate of discoveredCandidates) {
    if (seenKeys.has(candidate.key) || seenNames.has(candidate.title.toLowerCase())) {
      continue
    }

    mergedSeeds.push({
      key: candidate.key,
      name: candidate.title,
      summary: `Repository-backed integration candidate for ${candidate.title}.`,
      summaryDetails: {
        what: `A discovered external integration centered on ${candidate.metadata.connectedSystem}.`,
        whyItExists: candidate.descriptionHints[0],
        dependencies: buildIntegrationDependencies(candidate),
        inputsAndOutputs: [
          candidate.envVars.length > 0
            ? `Inputs include configuration such as ${candidate.envVars.join(', ')}.`
            : 'Inputs are inferred from repository imports and external calls.',
          candidate.externalHosts.length > 0
            ? `Outputs or remote traffic involve ${candidate.externalHosts.join(', ')}.`
            : 'The integration is referenced in code but remote hosts are not embedded directly in every file.',
        ],
        failurePointsAndRisks: [
          'Third-party availability or configuration drift can affect the dependent application flows.',
          'This integration inventory is heuristically discovered and may need manual scope trimming over time.',
        ],
        operationalConsiderations: [
          `Signals detected: ${candidate.metadata.signalKinds.join(', ')}.`,
          'TODO: Add manual ownership and escalation guidance once the integration list stabilizes.',
        ],
      },
      status: 'Discovered',
      connectedSystem: candidate.metadata.connectedSystem,
      owningArea: 'Platform',
      currentState: `Discovered from ${candidate.sourceFiles.length} files with ${candidate.envVars.length} env-var references.`,
      notes: candidate.descriptionHints,
      relatedFeatures: [],
      sourceFiles: candidate.sourceFiles,
    })
  }

  return mergedSeeds
}

function mergeDiscoveredRunbookSeeds(
  existingSeeds: RunbookDocSeed[],
  discoveredCandidates: RunbookDiscoveryCandidate[]
): RunbookDocSeed[] {
  const mergedSeeds = [...existingSeeds]
  const seenKeys = new Set(existingSeeds.map((seed) => seed.key))
  const seenNames = new Set(existingSeeds.map((seed) => seed.name.toLowerCase()))

  for (const candidate of discoveredCandidates) {
    if (seenKeys.has(candidate.key) || seenNames.has(candidate.title.toLowerCase())) {
      continue
    }

    mergedSeeds.push({
      key: candidate.key,
      name: candidate.title,
      summary: `Operational runbook candidate for ${candidate.title}.`,
      summaryDetails: {
        what: `A discovered operational scenario assembled from scripts, routes, and troubleshooting signals related to ${candidate.title}.`,
        whyItExists: candidate.descriptionHints[0],
        dependencies: [
          ...candidate.workflowFiles,
          ...candidate.adminPaths,
          ...candidate.webhookRoutes,
        ],
        operationalConsiderations: [
          `Signals detected: ${candidate.metadata.signalKinds.join(', ')}.`,
          'TODO: Replace generated steps with manually curated incident or maintenance procedures where needed.',
        ],
        failurePointsAndRisks: candidate.metadata.troubleshootingFiles.length > 0
          ? [`Troubleshooting-relevant files include ${candidate.metadata.troubleshootingFiles.join(', ')}.`]
          : ['Operational failure handling should be reviewed manually before relying on this runbook.'],
      },
      status: 'Discovered',
      owningArea: 'Operations',
      currentState: `Discovered from ${candidate.sourceFiles.length} operational files.`,
      notes: candidate.descriptionHints,
      prerequisites: buildRunbookPrerequisites(candidate),
      steps: buildRunbookSteps(candidate),
      sourceFiles: candidate.sourceFiles,
    })
  }

  return mergedSeeds
}

function buildFeatureSummary(candidate: FeatureDiscoveryCandidate): string {
  if (candidate.relatedApiRoutes.length > 0) {
    return `${candidate.title} is an app workflow discovered from ${candidate.pageRoutes.join(', ')} with related API routes ${candidate.relatedApiRoutes.join(', ')}.`
  }

  return `${candidate.title} is an app workflow discovered from ${candidate.pageRoutes.join(', ')}.`
}

function buildFeatureDependencies(candidate: FeatureDiscoveryCandidate): string[] {
  return [
    ...candidate.pageRoutes.map((routePath) => `Next.js route ${routePath}.`),
    ...candidate.relatedApiRoutes.map((routePath) => `Internal API route ${routePath}.`),
    ...candidate.majorComponents.map((componentName) => `UI component ${componentName}.`),
  ]
}

function buildFeatureRelatedIntegrations(candidate: FeatureDiscoveryCandidate): string[] {
  const relatedIntegrations: string[] = []

  if (candidate.relatedApiRoutes.some((routePath) => routePath.includes('/spotify'))) {
    relatedIntegrations.push('Spotify')
  }

  if (candidate.relatedApiRoutes.some((routePath) => routePath.includes('/ai/'))) {
    relatedIntegrations.push('OpenAI')
  }

  if (candidate.sourceFiles.some((filePath) => /supabase|auth/.test(filePath))) {
    relatedIntegrations.push('Supabase')
  }

  return dedupeStrings(relatedIntegrations)
}

function buildIntegrationDependencies(candidate: IntegrationDiscoveryCandidate): string[] {
  return dedupeStrings([
    ...candidate.envVars.map((envVar) => `Configuration variable ${envVar}.`),
    ...candidate.sdkImports.map((sdkImport) => `SDK import ${sdkImport}.`),
    ...candidate.externalHosts.map((host) => `External host ${host}.`),
    ...candidate.webhookRoutes.map((routePath) => `Webhook-related route ${routePath}.`),
  ])
}

function buildRunbookPrerequisites(candidate: RunbookDiscoveryCandidate): string[] {
  return dedupeStrings([
    candidate.workflowFiles.length > 0 ? 'Repository access to the relevant GitHub Actions workflow files.' : '',
    candidate.adminPaths.length > 0 ? 'Admin access to the application paths involved in the operation.' : '',
    candidate.commands.length > 0 ? 'A local environment capable of running the referenced scripts.' : '',
  ])
}

function buildRunbookSteps(candidate: RunbookDiscoveryCandidate): string[] {
  return dedupeStrings([
    'Review the listed source files and confirm which path or script applies to the current operational task.',
    candidate.workflowFiles.length > 0 ? `Inspect workflow files: ${candidate.workflowFiles.join(', ')}.` : '',
    candidate.commands.length > 0 ? `Run or rehearse commands such as ${candidate.commands.join(', ')}.` : '',
    candidate.adminPaths.length > 0 ? `Use the admin or API paths ${candidate.adminPaths.join(', ')} for the live change.` : '',
    candidate.webhookRoutes.length > 0 ? `Validate webhook-facing routes ${candidate.webhookRoutes.join(', ')} after the change.` : '',
    candidate.metadata.troubleshootingFiles.length > 0
      ? `Check troubleshooting signals in ${candidate.metadata.troubleshootingFiles.join(', ')} if the workflow fails.`
      : 'Confirm the operational flow succeeds and document any manual recovery steps that were required.',
  ])
}

function inferOwningArea(title: string): string {
  if (title.includes('Tournament')) {
    return 'Competition'
  }

  if (title.includes('Player') || title.includes('Account') || title.includes('Profile')) {
    return 'Accounts'
  }

  if (title.includes('Post')) {
    return 'Content'
  }

  return 'Application'
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))]
}
