import {
  extractExternalHosts,
  extractExternalImports,
  extractProcessEnvVars,
  hasWebhookSignal,
  normalizeCandidateKey,
} from '../shared/docSignals'
import { getAppRouteFromFilePath, scanRepo, type RepoFile } from '../shared/repoScan'

export type IntegrationDiscoveryCandidate = {
  key: string
  title: string
  sourceFiles: string[]
  descriptionHints: string[]
  envVars: string[]
  sdkImports: string[]
  externalHosts: string[]
  webhookRoutes: string[]
  metadata: {
    connectedSystem: string
    signalKinds: string[]
  }
}

type IntegrationAccumulator = {
  title: string
  connectedSystem: string
  sourceFiles: Set<string>
  descriptionHints: Set<string>
  envVars: Set<string>
  sdkImports: Set<string>
  externalHosts: Set<string>
  webhookRoutes: Set<string>
  signalKinds: Set<string>
}

const INTEGRATION_CATALOG = [
  {
    key: 'supabase',
    title: 'Supabase',
    connectedSystem: 'Supabase Auth + Postgres',
    matches(signal: { envVar: string[]; imports: string[]; hosts: string[]; filePath: string }) {
      return (
        signal.envVar.some((envVar) => envVar.includes('SUPABASE')) ||
        signal.imports.some((value) => value.includes('supabase')) ||
        signal.hosts.some((host) => host.includes('supabase.co')) ||
        signal.filePath.includes('supabase')
      )
    },
  },
  {
    key: 'openai',
    title: 'OpenAI',
    connectedSystem: 'OpenAI API',
    matches(signal: { envVar: string[]; imports: string[]; hosts: string[]; filePath: string }) {
      return (
        signal.envVar.some((envVar) => envVar.includes('OPENAI')) ||
        signal.imports.some((value) => value === 'openai') ||
        signal.hosts.some((host) => host.includes('openai.com')) ||
        signal.filePath.includes('/ai/') ||
        signal.filePath.endsWith('lib/openai.ts')
      )
    },
  },
  {
    key: 'spotify',
    title: 'Spotify',
    connectedSystem: 'Spotify Web API',
    matches(signal: { envVar: string[]; imports: string[]; hosts: string[]; filePath: string }) {
      return (
        signal.envVar.some((envVar) => envVar.includes('SPOTIFY')) ||
        signal.hosts.some((host) => host.includes('spotify.com')) ||
        signal.filePath.includes('spotify')
      )
    },
  },
  {
    key: 'confluence-docs-sync',
    title: 'Confluence Docs Sync',
    connectedSystem: 'Confluence Forge webhook',
    matches(signal: { envVar: string[]; imports: string[]; hosts: string[]; filePath: string }) {
      return (
        signal.envVar.some((envVar) => envVar.includes('CONFLUENCE')) ||
        signal.filePath === '.github/workflows/docs-sync.yml' ||
        signal.filePath.startsWith('app/api/docs-sync/') ||
        signal.filePath === 'lib/docs-sync/sendPayload.ts' ||
        signal.filePath === 'scripts/docs-sync.ts' ||
        signal.filePath === 'scripts/run-docs-seed.mjs'
      )
    },
  },
] as const

export function discoverIntegrations(options: { rootDir?: string; repoFiles?: RepoFile[] } = {}): IntegrationDiscoveryCandidate[] {
  const repoFiles = options.repoFiles ?? scanRepo({ rootDir: options.rootDir })
  const accumulators = new Map<string, IntegrationAccumulator>()

  for (const repoFile of repoFiles) {
    if (!isIntegrationRelevantFile(repoFile.path)) {
      continue
    }

    const envVars = extractProcessEnvVars(repoFile.content).filter((envVar) => !isIgnoredEnvVar(envVar))
    const imports = extractExternalImports(repoFile.content)
    const externalHosts = extractExternalHosts(repoFile.content)
    const webhookRoute = hasWebhookSignal(repoFile.path, repoFile.content) ? getAppRouteFromFilePath(repoFile.path) : undefined

    for (const integrationDefinition of INTEGRATION_CATALOG) {
      if (!integrationDefinition.matches({ envVar: envVars, imports, hosts: externalHosts, filePath: repoFile.path })) {
        continue
      }

      const accumulator = getOrCreateAccumulator(accumulators, integrationDefinition.key, integrationDefinition.title, integrationDefinition.connectedSystem)
      accumulator.sourceFiles.add(repoFile.path)
      envVars.forEach((envVar) => accumulator.envVars.add(envVar))
      imports.forEach((value) => accumulator.sdkImports.add(value))
      externalHosts.forEach((host) => accumulator.externalHosts.add(host))
      if (webhookRoute) {
        accumulator.webhookRoutes.add(webhookRoute)
      }
      if (envVars.length > 0) {
        accumulator.signalKinds.add('process.env usage')
      }
      if (imports.length > 0) {
        accumulator.signalKinds.add('third-party SDK import')
      }
      if (externalHosts.length > 0) {
        accumulator.signalKinds.add('external HTTP call')
      }
      if (webhookRoute) {
        accumulator.signalKinds.add('webhook handler')
      }
      accumulator.descriptionHints.add(buildDescriptionHint(integrationDefinition.title, envVars, imports, externalHosts, webhookRoute))
    }
  }

  return [...accumulators.entries()]
    .map(([key, accumulator]) => ({
      key: normalizeCandidateKey(key),
      title: accumulator.title,
      sourceFiles: [...accumulator.sourceFiles].sort((left, right) => left.localeCompare(right)),
      descriptionHints: [...accumulator.descriptionHints].sort((left, right) => left.localeCompare(right)),
      envVars: [...accumulator.envVars].sort((left, right) => left.localeCompare(right)),
      sdkImports: [...accumulator.sdkImports].sort((left, right) => left.localeCompare(right)),
      externalHosts: [...accumulator.externalHosts].sort((left, right) => left.localeCompare(right)),
      webhookRoutes: [...accumulator.webhookRoutes].sort((left, right) => left.localeCompare(right)),
      metadata: {
        connectedSystem: accumulator.connectedSystem,
        signalKinds: [...accumulator.signalKinds].sort((left, right) => left.localeCompare(right)),
      },
    }))
    .sort((left, right) => left.title.localeCompare(right.title))
}

function buildDescriptionHint(
  title: string,
  envVars: string[],
  imports: string[],
  externalHosts: string[],
  webhookRoute?: string
): string {
  const parts = [`Detected ${title} from repository signals.`]

  if (envVars.length > 0) {
    parts.push(`Env vars: ${envVars.join(', ')}.`)
  }

  if (imports.length > 0) {
    parts.push(`SDK imports: ${imports.join(', ')}.`)
  }

  if (externalHosts.length > 0) {
    parts.push(`External hosts: ${externalHosts.join(', ')}.`)
  }

  if (webhookRoute) {
    parts.push(`Webhook-like route: ${webhookRoute}.`)
  }

  return parts.join(' ')
}

function getOrCreateAccumulator(
  accumulators: Map<string, IntegrationAccumulator>,
  key: string,
  title: string,
  connectedSystem: string
): IntegrationAccumulator {
  const existingAccumulator = accumulators.get(key)

  if (existingAccumulator) {
    return existingAccumulator
  }

  const createdAccumulator: IntegrationAccumulator = {
    title,
    connectedSystem,
    sourceFiles: new Set<string>(),
    descriptionHints: new Set<string>(),
    envVars: new Set<string>(),
    sdkImports: new Set<string>(),
    externalHosts: new Set<string>(),
    webhookRoutes: new Set<string>(),
    signalKinds: new Set<string>(),
  }

  accumulators.set(key, createdAccumulator)

  return createdAccumulator
}

function isIgnoredEnvVar(envVar: string): boolean {
  return envVar === 'NODE_ENV' || envVar === 'NEXT_PUBLIC_VERCEL_ENV'
}

function isIntegrationRelevantFile(filePath: string): boolean {
  return (
    filePath.startsWith('app/') ||
    filePath.startsWith('lib/') ||
    filePath.startsWith('scripts/') ||
    filePath.startsWith('.github/')
  )
}
