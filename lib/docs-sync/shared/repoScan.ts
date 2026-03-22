declare const process: {
  cwd(): string
}

declare function require(moduleName: string): any

const { readdirSync, readFileSync, statSync } = require('fs') as {
  readdirSync: (directoryPath: string, options: { withFileTypes: true }) => Array<{
    name: string
    isDirectory(): boolean
    isFile(): boolean
  }>
  readFileSync: (filePath: string, encoding: string) => string
  statSync: (filePath: string) => {
    isDirectory(): boolean
  }
}
const path = require('path') as {
  basename(filePath: string): string
  extname(filePath: string): string
  join(...paths: string[]): string
  relative(from: string, to: string): string
}

export type RepoFile = {
  path: string
  absolutePath: string
  content: string
}

export type ScanRepoOptions = {
  rootDir?: string
  includeDirs?: string[]
  extensions?: string[]
}

const DEFAULT_INCLUDE_DIRS = ['app', 'lib', 'scripts', '.github', 'supabase']
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.sql']
const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.next',
  '.tmp-docs-sync-runner',
  '.tmp-docs-sync-tests',
  'coverage',
  'dist',
  'build',
  'node_modules',
  'forge',
])

export function scanRepo(options: ScanRepoOptions = {}): RepoFile[] {
  const rootDir = options.rootDir ?? getRepoRoot()
  const includeDirs = options.includeDirs ?? DEFAULT_INCLUDE_DIRS
  const extensions = new Set(options.extensions ?? DEFAULT_EXTENSIONS)
  const repoFiles: RepoFile[] = []

  for (const includeDir of includeDirs) {
    const absoluteDir = path.join(rootDir, includeDir)

    if (!safeIsDirectory(absoluteDir)) {
      continue
    }

    walkDirectory(rootDir, absoluteDir, repoFiles, extensions)
  }

  return repoFiles.sort((left, right) => left.path.localeCompare(right.path))
}

export function getRepoRoot(): string {
  return process.cwd()
}

export function getAppRouteFromFilePath(filePath: string): string | undefined {
  if (!filePath.startsWith('app/')) {
    return undefined
  }

  const withoutAppPrefix = filePath.slice('app/'.length)
  const withoutFileName = withoutAppPrefix.replace(/(^|\/)(page|route)\.[^.]+$/, '')

  if (withoutFileName.length === 0) {
    return '/'
  }

  const routeSegments = withoutFileName
    .split('/')
    .filter((segment) => segment.length > 0)
    .filter((segment) => !isRouteGroupSegment(segment))

  return `/${routeSegments.join('/')}`
}

export function getRouteGroups(filePath: string): string[] {
  return filePath
    .split('/')
    .filter((segment) => isRouteGroupSegment(segment))
    .map((segment) => segment.slice(1, -1))
}

export function isRouteGroupSegment(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')')
}

export function getDirectoryPath(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  return lastSlashIndex === -1 ? '' : normalizedPath.slice(0, lastSlashIndex)
}

export function getBaseName(filePath: string): string {
  return path.basename(filePath)
}

export function getRepoFilesUnderDirectory(repoFiles: RepoFile[], directoryPath: string): RepoFile[] {
  const normalizedDirectoryPath = directoryPath.replace(/\\/g, '/')
  const prefix = normalizedDirectoryPath.length === 0 ? '' : `${normalizedDirectoryPath}/`

  return repoFiles.filter(
    (repoFile) => repoFile.path === normalizedDirectoryPath || repoFile.path.startsWith(prefix)
  )
}

function walkDirectory(
  rootDir: string,
  directoryPath: string,
  repoFiles: RepoFile[],
  extensions: Set<string>
) {
  const directoryEntries = readdirSync(directoryPath, { withFileTypes: true })

  for (const directoryEntry of directoryEntries) {
    if (IGNORED_DIR_NAMES.has(directoryEntry.name)) {
      continue
    }

    const absolutePath = path.join(directoryPath, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      walkDirectory(rootDir, absolutePath, repoFiles, extensions)
      continue
    }

    if (!directoryEntry.isFile()) {
      continue
    }

    if (!extensions.has(path.extname(directoryEntry.name))) {
      continue
    }

    repoFiles.push({
      path: path.relative(rootDir, absolutePath).replace(/\\/g, '/'),
      absolutePath,
      content: readFileSync(absolutePath, 'utf8'),
    })
  }
}

function safeIsDirectory(directoryPath: string): boolean {
  try {
    return statSync(directoryPath).isDirectory()
  } catch {
    return false
  }
}
