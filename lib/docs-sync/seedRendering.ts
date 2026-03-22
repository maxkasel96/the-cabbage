import type {
  DocsSummaryDetails,
  DocsSyncPageType,
  FeatureDocSeed,
  IntegrationDocSeed,
  RunbookDocSeed,
} from './types'

const EXTERNAL_ID_PREFIX = 'nextjs-app'

type SummarySection = {
  heading: string
  body: string
}

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
    ['Summary', buildSummaryContent(seed.summary, seed.summaryDetails)],
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
    ['Summary', buildSummaryContent(seed.summary, seed.summaryDetails)],
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
    ['Summary', buildSummaryContent(seed.summary, seed.summaryDetails)],
    ['Current State', `<p>${escapeHtml(seed.currentState)}</p>`],
    ['Status', `<p>${escapeHtml(seed.status)}</p>`],
    ['Owner', `<p>${escapeHtml(seed.owner ?? 'Unassigned')}</p>`],
    ['Owning Area', `<p>${escapeHtml(seed.owningArea ?? 'Not specified')}</p>`],
    ['Prerequisites', buildList(seed.prerequisites ?? [])],
    ['Procedure', buildOrderedList(seed.steps)],
    ['Notes', buildList(seed.notes)],
  ])
}

export function buildSummaryContent(summary: string, summaryDetails?: DocsSummaryDetails): string {
  const sections = getSummarySections(summaryDetails)

  if (sections.length === 0) {
    return `<p>${escapeHtml(summary)}</p>`
  }

  return [
    `<p>${escapeHtml(summary)}</p>`,
    ...sections.map(({ heading, body }) => `<p><strong>${escapeHtml(heading)}:</strong></p>${body}`),
  ].join('')
}

function getSummarySections(summaryDetails?: DocsSummaryDetails): SummarySection[] {
  if (summaryDetails === undefined) {
    return []
  }

  return [
    buildSummaryParagraphSection('What this is', summaryDetails.what),
    buildSummaryParagraphSection('Why it exists', summaryDetails.whyItExists),
    buildSummaryListSection('Who uses it', summaryDetails.whoUsesIt),
    buildSummaryListSection('Core flow', summaryDetails.flow),
    buildSummaryListSection('Dependencies', summaryDetails.dependencies),
    buildSummaryListSection('Inputs and outputs', summaryDetails.inputsAndOutputs),
    buildSummaryListSection('Expected behavior', summaryDetails.expectedBehavior),
    buildSummaryListSection('Failure points and risks', summaryDetails.failurePointsAndRisks),
    buildSummaryListSection('Operational considerations', summaryDetails.operationalConsiderations),
    buildSummaryListSection(
      'Known limitations and future improvements',
      summaryDetails.limitationsAndFutureImprovements
    ),
  ].filter((section): section is SummarySection => section !== undefined)
}

function buildSummaryParagraphSection(heading: string, value?: string): SummarySection | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  return {
    heading,
    body: `<p>${escapeHtml(value)}</p>`,
  }
}

function buildSummaryListSection(heading: string, items?: string[]): SummarySection | undefined {
  if (!Array.isArray(items)) {
    return undefined
  }

  const normalizedItems = items.map((item) => item.trim()).filter((item) => item.length > 0)

  if (normalizedItems.length === 0) {
    return undefined
  }

  return {
    heading,
    body: buildList(normalizedItems),
  }
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
