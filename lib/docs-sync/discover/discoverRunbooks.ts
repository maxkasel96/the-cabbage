import { hasErrorHandlingSignal, hasOperationalLoggingSignal, hasWebhookSignal, normalizeCandidateKey } from '../shared/docSignals'
import { getAppRouteFromFilePath, scanRepo, type RepoFile } from '../shared/repoScan'

export type RunbookDiscoveryCandidate = {
  key: string
  title: string
  sourceFiles: string[]
  descriptionHints: string[]
  commands: string[]
  adminPaths: string[]
  workflowFiles: string[]
  webhookRoutes: string[]
  metadata: {
    signalKinds: string[]
    troubleshootingFiles: string[]
  }
}

type RunbookDefinition = {
  key: string
  title: string
  matcher(filePath: string): boolean
}

type RunbookAccumulator = {
  title: string
  sourceFiles: Set<string>
  descriptionHints: Set<string>
  commands: Set<string>
  adminPaths: Set<string>
  workflowFiles: Set<string>
  webhookRoutes: Set<string>
  signalKinds: Set<string>
  troubleshootingFiles: Set<string>
}

const RUNBOOK_DEFINITIONS: RunbookDefinition[] = [
  {
    key: 'docs-sync-operations',
    title: 'Docs Sync Operations',
    matcher(filePath) {
      return (
        filePath === '.github/workflows/docs-sync.yml' ||
        filePath.startsWith('app/api/docs-sync/') ||
        filePath === 'lib/docs-sync/sendPayload.ts' ||
        filePath === 'lib/docs-sync/seedPayloads.ts' ||
        filePath === 'lib/docs-sync/seedData.ts' ||
        filePath === 'lib/docs-sync/syncAll.ts' ||
        filePath === 'scripts/docs-sync.ts' ||
        filePath === 'scripts/run-docs-seed.mjs'
      )
    },
  },
  {
    key: 'tournament-administration',
    title: 'Tournament Administration',
    matcher(filePath) {
      return filePath.includes('admin/tournaments') || filePath.includes('/tournaments/') || filePath.endsWith('app/history/page.tsx') || filePath.endsWith('app/bracket/page.tsx')
    },
  },
  {
    key: 'game-catalog-administration',
    title: 'Game Catalog Administration',
    matcher(filePath) {
      return filePath.includes('admin/games') || filePath.includes('admin/tags') || filePath.includes('admin/players') || filePath.includes('api/admin/games') || filePath.includes('api/admin/tags') || filePath.includes('api/admin/players')
    },
  },
  {
    key: 'spotify-playlist-configuration',
    title: 'Spotify Playlist Configuration',
    matcher(filePath) {
      return filePath.includes('spotify-favorite-playlists') || filePath === 'lib/spotify.ts' || filePath.endsWith('app/admin/app-configurations/page.tsx')
    },
  },
  // TODO: Expand or split operational clusters when teams want more granular runbooks.
]

export function discoverRunbooks(options: { rootDir?: string; repoFiles?: RepoFile[] } = {}): RunbookDiscoveryCandidate[] {
  const repoFiles = options.repoFiles ?? scanRepo({ rootDir: options.rootDir })
  const accumulators = new Map<string, RunbookAccumulator>()

  for (const repoFile of repoFiles) {
    for (const runbookDefinition of RUNBOOK_DEFINITIONS) {
      if (!runbookDefinition.matcher(repoFile.path)) {
        continue
      }

      const accumulator = getOrCreateAccumulator(accumulators, runbookDefinition)
      accumulator.sourceFiles.add(repoFile.path)

      if (repoFile.path.startsWith('.github/workflows/')) {
        accumulator.workflowFiles.add(repoFile.path)
        accumulator.signalKinds.add('GitHub Actions workflow')
      }

      if (repoFile.path.startsWith('scripts/')) {
        accumulator.commands.add(`node ${repoFile.path}`)
        accumulator.signalKinds.add('script command')
      }

      const routePath = getAppRouteFromFilePath(repoFile.path)

      if (routePath?.startsWith('/api/admin') || routePath?.startsWith('/admin')) {
        accumulator.adminPaths.add(routePath)
        accumulator.signalKinds.add('admin-only path')
      }

      if (hasWebhookSignal(repoFile.path, repoFile.content) && routePath) {
        accumulator.webhookRoutes.add(routePath)
        accumulator.signalKinds.add('webhook handler')
      }

      if (hasErrorHandlingSignal(repoFile.content) || hasOperationalLoggingSignal(repoFile.content)) {
        accumulator.troubleshootingFiles.add(repoFile.path)
        accumulator.signalKinds.add('failure or troubleshooting signal')
      }

      accumulator.descriptionHints.add(buildRunbookDescriptionHint(runbookDefinition.title, routePath, repoFile.path))
    }
  }

  return [...accumulators.entries()]
    .map(([key, accumulator]) => ({
      key: normalizeCandidateKey(key),
      title: accumulator.title,
      sourceFiles: [...accumulator.sourceFiles].sort((left, right) => left.localeCompare(right)),
      descriptionHints: [...accumulator.descriptionHints].sort((left, right) => left.localeCompare(right)),
      commands: [...accumulator.commands].sort((left, right) => left.localeCompare(right)),
      adminPaths: [...accumulator.adminPaths].sort((left, right) => left.localeCompare(right)),
      workflowFiles: [...accumulator.workflowFiles].sort((left, right) => left.localeCompare(right)),
      webhookRoutes: [...accumulator.webhookRoutes].sort((left, right) => left.localeCompare(right)),
      metadata: {
        signalKinds: [...accumulator.signalKinds].sort((left, right) => left.localeCompare(right)),
        troubleshootingFiles: [...accumulator.troubleshootingFiles].sort((left, right) => left.localeCompare(right)),
      },
    }))
    .sort((left, right) => left.title.localeCompare(right.title))
}

function buildRunbookDescriptionHint(title: string, routePath: string | undefined, filePath: string): string {
  if (routePath) {
    return `Operational signals for ${title} include ${routePath} from ${filePath}.`
  }

  return `Operational signals for ${title} include ${filePath}.`
}

function getOrCreateAccumulator(
  accumulators: Map<string, RunbookAccumulator>,
  runbookDefinition: RunbookDefinition
): RunbookAccumulator {
  const existingAccumulator = accumulators.get(runbookDefinition.key)

  if (existingAccumulator) {
    return existingAccumulator
  }

  const createdAccumulator: RunbookAccumulator = {
    title: runbookDefinition.title,
    sourceFiles: new Set<string>(),
    descriptionHints: new Set<string>(),
    commands: new Set<string>(),
    adminPaths: new Set<string>(),
    workflowFiles: new Set<string>(),
    webhookRoutes: new Set<string>(),
    signalKinds: new Set<string>(),
    troubleshootingFiles: new Set<string>(),
  }

  accumulators.set(runbookDefinition.key, createdAccumulator)

  return createdAccumulator
}
