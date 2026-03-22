declare function require(moduleName: string): any

const path = require('path') as {
  posix: {
    dirname(filePath: string): string
    join(...paths: string[]): string
    normalize(filePath: string): string
  }
}

const EXTERNAL_IMPORT_REGEX = /(?:import|export)\s+(?:[^'"`]+?\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g
const PROCESS_ENV_REGEX = /process\.env\.([A-Z0-9_]+)/g
const INTERNAL_API_REGEX = /fetch\(\s*[`'"]([^`'"]*\/api\/[^`'"]+)[`'"]/g
const ABSOLUTE_URL_REGEX = /https?:\/\/([^/"'`\s)]+)/g
const RELATIVE_IMPORT_REGEX = /(?:import|export)\s+(?:[^'"`]+?\s+from\s+)?['"]((?:\.{1,2}\/)[^'"]+)['"]/g
const CAPITALIZED_IDENTIFIER_REGEX = /\b([A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+)\b/g

const IGNORED_EXTERNAL_IMPORTS = new Set([
  'react',
  'react-dom',
  'next',
  'next/server',
  'next/headers',
  'next/navigation',
  'next/cache',
  'node:assert/strict',
])

export function extractProcessEnvVars(content: string): string[] {
  return matchAllUnique(content, PROCESS_ENV_REGEX)
}

export function extractExternalImports(content: string): string[] {
  const imports = new Set<string>()

  for (const match of content.matchAll(EXTERNAL_IMPORT_REGEX)) {
    const importPath = (match[1] ?? match[2] ?? '').trim()

    if (
      importPath.length === 0 ||
      importPath.startsWith('.') ||
      importPath.startsWith('@/') ||
      importPath.startsWith('node:') ||
      IGNORED_EXTERNAL_IMPORTS.has(importPath)
    ) {
      continue
    }

    imports.add(importPath)
  }

  return [...imports].sort((left, right) => left.localeCompare(right))
}

export function extractRelativeImports(content: string): string[] {
  return matchAllUnique(content, RELATIVE_IMPORT_REGEX).sort((left, right) => left.localeCompare(right))
}

export function extractInternalApiCalls(content: string): string[] {
  return matchAllUnique(content, INTERNAL_API_REGEX)
    .map((routePath) => routePath.replace(/\?.*$/, ''))
    .sort((left, right) => left.localeCompare(right))
}

export function extractExternalHosts(content: string): string[] {
  return matchAllUnique(content, ABSOLUTE_URL_REGEX)
    .map((host) => host.toLowerCase())
    .filter((host) => !host.startsWith('localhost'))
    .sort((left, right) => left.localeCompare(right))
}

export function extractCapitalizedIdentifiers(content: string): string[] {
  const identifiers = matchAllUnique(content, CAPITALIZED_IDENTIFIER_REGEX)

  return identifiers
    .filter((identifier) => identifier.length >= 6)
    .sort((left, right) => left.localeCompare(right))
}

export function hasServerActionSignal(content: string): boolean {
  return content.includes("'use server'") || content.includes('"use server"')
}

export function hasErrorHandlingSignal(content: string): boolean {
  return /(catch\s*\(|throw new Error|console\.error|Response\.json\([^)]*error|retry)/.test(content)
}

export function hasWebhookSignal(filePath: string, content: string): boolean {
  return /webhook/i.test(filePath) || /webhook/i.test(content)
}

export function hasOperationalLoggingSignal(content: string): boolean {
  return /console\.(error|warn)|logger|failed|failure|troubleshoot/i.test(content)
}

export function normalizeCandidateKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, 'detail')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function humanizePathSegment(segment: string): string {
  const cleanedSegment = segment
    .replace(/^\(|\)$/g, '')
    .replace(/^\[(.+)\]$/, '$1 detail')
    .replace(/[-_]+/g, ' ')
    .trim()

  return cleanedSegment
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function titleFromRoute(routePath: string): string {
  if (routePath === '/') {
    return 'Home'
  }

  return routePath
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(humanizePathSegment)
    .join(' / ')
}

export function toRepoPath(fromFilePath: string, importPath: string): string {
  const fromDirectory = path.posix.dirname(fromFilePath)
  const normalizedPath = path.posix.normalize(path.posix.join(fromDirectory, importPath))

  return normalizedPath.replace(/^\.\//, '')
}

function matchAllUnique(content: string, pattern: RegExp): string[] {
  const matches = new Set<string>()

  for (const match of content.matchAll(pattern)) {
    const value = (match[1] ?? '').trim()

    if (value.length > 0) {
      matches.add(value)
      continue
    }

    const fallbackValue = (match[2] ?? '').trim()

    if (fallbackValue.length > 0) {
      matches.add(fallbackValue)
    }
  }

  return [...matches]
}
