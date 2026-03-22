import {
  extractCapitalizedIdentifiers,
  extractInternalApiCalls,
  extractRelativeImports,
  hasServerActionSignal,
  normalizeCandidateKey,
  titleFromRoute,
  toRepoPath,
} from '../shared/docSignals'
import {
  getAppRouteFromFilePath,
  getDirectoryPath,
  getRepoFilesUnderDirectory,
  getRouteGroups,
  scanRepo,
  type RepoFile,
} from '../shared/repoScan'

export type FeatureDiscoveryCandidate = {
  key: string
  title: string
  sourceFiles: string[]
  descriptionHints: string[]
  pageRoutes: string[]
  relatedApiRoutes: string[]
  routeGroups: string[]
  majorComponents: string[]
  metadata: {
    hasServerActionSignals: boolean
    workflowSignals: string[]
  }
}

export function discoverFeatures(options: { rootDir?: string; repoFiles?: RepoFile[] } = {}): FeatureDiscoveryCandidate[] {
  const repoFiles = options.repoFiles ?? scanRepo({ rootDir: options.rootDir })
  const pageFiles = repoFiles.filter((repoFile) => isFeaturePage(repoFile.path))

  return pageFiles
    .map((pageFile) => buildFeatureCandidate(pageFile, repoFiles))
    .filter((candidate): candidate is FeatureDiscoveryCandidate => candidate !== undefined)
    .sort((left, right) => left.title.localeCompare(right.title))
}

function buildFeatureCandidate(pageFile: RepoFile, repoFiles: RepoFile[]): FeatureDiscoveryCandidate | undefined {
  const routePath = getAppRouteFromFilePath(pageFile.path)

  if (!routePath || isExcludedFeatureRoute(routePath)) {
    return undefined
  }

  const directoryPath = getDirectoryPath(pageFile.path)
  const directoryFiles = getRepoFilesUnderDirectory(repoFiles, directoryPath).filter(
    (repoFile) => getDirectoryPath(repoFile.path) === directoryPath
  )
  const siblingSourceFiles = directoryFiles
    .map((repoFile) => repoFile.path)
    .filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    .filter((filePath) => !filePath.endsWith('/route.ts'))
  const relatedApiRoutes = new Set<string>()

  for (const repoFile of directoryFiles) {
    for (const apiRoute of extractInternalApiCalls(repoFile.content)) {
      relatedApiRoutes.add(apiRoute)
    }
  }

  for (const apiRoute of extractInternalApiCalls(pageFile.content)) {
    relatedApiRoutes.add(apiRoute)
  }

  const importedComponents = extractRelativeImports(pageFile.content)
    .map((relativeImport) => toRepoPath(pageFile.path, relativeImport))
    .filter((repoPath) => repoPath.startsWith('app/'))
    .map((repoPath) => repoPath.replace(/\.(ts|tsx)$/, ''))
  const majorComponents = dedupeStrings([
    ...importedComponents
      .filter((repoPath) => /[A-Z][A-Za-z0-9]+$/.test(repoPath))
      .map((repoPath) => {
        const pathSegments = repoPath.split('/')

        return pathSegments[pathSegments.length - 1] ?? repoPath
      }),
    ...extractCapitalizedIdentifiers(pageFile.content).filter((identifier) => /(Modal|Form|Card|Uploader|Menu|Nav)$/.test(identifier)),
  ]).slice(0, 6)
  const routeGroups = getRouteGroups(pageFile.path)
  const hasServerActionSignals = directoryFiles.some((repoFile) => hasServerActionSignal(repoFile.content))
  const workflowSignals = dedupeStrings([
    relatedApiRoutes.size > 0 ? 'API-backed user flow' : '',
    majorComponents.length > 0 ? 'Major UI screen' : '',
    routeGroups.length > 0 ? 'Route group' : '',
    hasServerActionSignals ? 'Server action' : '',
    siblingSourceFiles.length >= 3 ? 'Multi-file workflow' : '',
  ]).filter((signal) => signal.length > 0)

  return {
    key: inferFeatureKey(routePath, relatedApiRoutes),
    title: inferFeatureTitle(routePath, relatedApiRoutes),
    sourceFiles: dedupeStrings([pageFile.path, ...siblingSourceFiles]).sort((left, right) => left.localeCompare(right)),
    descriptionHints: buildFeatureDescriptionHints(routePath, relatedApiRoutes, routeGroups, majorComponents),
    pageRoutes: [routePath],
    relatedApiRoutes: [...relatedApiRoutes].sort((left, right) => left.localeCompare(right)),
    routeGroups,
    majorComponents,
    metadata: {
      hasServerActionSignals,
      workflowSignals,
    },
  }
}

function buildFeatureDescriptionHints(
  routePath: string,
  relatedApiRoutes: Set<string>,
  routeGroups: string[],
  majorComponents: string[]
): string[] {
  return dedupeStrings([
    `App route ${routePath}.`,
    relatedApiRoutes.size > 0
      ? `Uses internal API routes ${[...relatedApiRoutes].sort((left, right) => left.localeCompare(right)).join(', ')}.`
      : 'Uses a primarily client-rendered route with local workflow state.',
    routeGroups.length > 0 ? `Lives inside route groups: ${routeGroups.join(', ')}.` : '',
    majorComponents.length > 0 ? `References major components such as ${majorComponents.join(', ')}.` : '',
  ]).filter((hint) => hint.length > 0)
}

function inferFeatureKey(routePath: string, relatedApiRoutes: Set<string>): string {
  if (routePath === '/' && relatedApiRoutes.has('/api/ai/recommend-games')) {
    return 'game-recommendations'
  }

  if (routePath === '/account/profile') {
    return 'account-profile-management'
  }

  return normalizeCandidateKey(routePath === '/' ? 'home' : routePath)
}

function inferFeatureTitle(routePath: string, relatedApiRoutes: Set<string>): string {
  if (routePath === '/' && relatedApiRoutes.has('/api/ai/recommend-games')) {
    return 'Game Recommendations'
  }

  if (routePath === '/history') {
    return 'Tournament History'
  }

  if (routePath === '/bracket') {
    return 'Tournament Bracket'
  }

  if (routePath === '/rules') {
    return 'Rules Management'
  }

  if (routePath === '/game-data') {
    return 'Game Data Explorer'
  }

  if (routePath === '/posts') {
    return 'Posts and Updates'
  }

  if (routePath === '/account/profile') {
    return 'Account Profile Management'
  }

  if (routePath === '/player-cards') {
    return 'Player Cards'
  }

  if (routePath.startsWith('/players/')) {
    return 'Player Profiles'
  }

  return titleFromRoute(routePath)
}

function isFeaturePage(filePath: string): boolean {
  return /^app\/.+\/page\.tsx$/.test(filePath) || filePath === 'app/page.tsx'
}

function isExcludedFeatureRoute(routePath: string): boolean {
  return (
    routePath.startsWith('/admin') ||
    routePath.startsWith('/auth/callback') ||
    routePath.startsWith('/auth/logout') ||
    routePath.startsWith('/auth/unauthorized')
  )
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))]
}
