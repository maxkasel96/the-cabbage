import type { DocsSyncPageType, FeatureDocSeed, IntegrationDocSeed, RunbookDocSeed } from './types'

const EXTERNAL_ID_PREFIX = 'nextjs-app'

export function buildSeedDocumentExternalId(pageType: DocsSyncPageType, seedKey: string): string {
  return `${EXTERNAL_ID_PREFIX}:${pageType}:${seedKey.trim()}`
}

export function buildRunbookTitle(name: string): string {
  return `Runbook - ${name.trim()}`
}

export function buildRunbookExternalId(seedKey: string): string {
  return buildSeedDocumentExternalId('runbook-page', seedKey)
}

export function buildFeatureDocContent(seed: FeatureDocSeed): string {
  return buildSeedHtmlDocument(seed.name, [
    ['Summary', `<p>${escapeHtml(seed.summary)}</p>`],
    ['Current State', `<p>${escapeHtml(seed.currentState)}</p>`],
    ['Status', `<p>${escapeHtml(seed.status)}</p>`],
    ['Owner', `<p>${escapeHtml(seed.owner ?? 'Unassigned')}</p>`],
    ['Owning Area', `<p>${escapeHtml(seed.owningArea ?? 'Not specified')}</p>`],
    ['Related Integrations', buildList(seed.relatedIntegrations ?? [])],
    ['Notes', buildList(seed.notes)],
  ])
}

export function buildIntegrationDocContent(seed: IntegrationDocSeed): string {
  return buildSeedHtmlDocument(seed.name, [
    ['Summary', `<p>${escapeHtml(seed.summary)}</p>`],
    ['Current State', `<p>${escapeHtml(seed.currentState)}</p>`],
    ['Status', `<p>${escapeHtml(seed.status)}</p>`],
    ['Connected System', `<p>${escapeHtml(seed.connectedSystem)}</p>`],
    ['Owner', `<p>${escapeHtml(seed.owner ?? 'Unassigned')}</p>`],
    ['Owning Area', `<p>${escapeHtml(seed.owningArea ?? 'Not specified')}</p>`],
    ['Related Features', buildList(seed.relatedFeatures ?? [])],
    ['Notes', buildList(seed.notes)],
  ])
}

export function buildRunbookContent(seed: RunbookDocSeed): string {
  return buildSeedHtmlDocument(buildRunbookTitle(seed.name), [
    ['Summary', `<p>${escapeHtml(seed.summary)}</p>`],
    ['Current State', `<p>${escapeHtml(seed.currentState)}</p>`],
    ['Status', `<p>${escapeHtml(seed.status)}</p>`],
    ['Owner', `<p>${escapeHtml(seed.owner ?? 'Unassigned')}</p>`],
    ['Owning Area', `<p>${escapeHtml(seed.owningArea ?? 'Not specified')}</p>`],
    ['Prerequisites', buildList(seed.prerequisites ?? [])],
    ['Procedure', buildOrderedList(seed.steps)],
    ['Notes', buildList(seed.notes)],
  ])
}

function buildSeedHtmlDocument(title: string, sections: Array<[string, string]>): string {
  return [`<article><h1>${escapeHtml(title)}</h1>`, ...sections.map(buildSection), '</article>'].join('')
}

function buildSection([heading, content]: [string, string]): string {
  return `<section><h2>${escapeHtml(heading)}</h2>${content}</section>`
}

function buildList(items: string[]): string {
  if (items.length === 0) {
    return '<p>None documented.</p>'
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function buildOrderedList(items: string[]): string {
  if (items.length === 0) {
    return '<p>No procedure steps documented.</p>'
  }

  return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
