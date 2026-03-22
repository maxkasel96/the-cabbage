import {
  CONFLUENCE_INDEX_TITLES,
  CONFLUENCE_SITE_BASE_URL,
  CONFLUENCE_SPACE_KEY,
} from '../config/constants';
import type {
  DocumentationSyncContext,
  SupportedPageType,
  ValidatedDocumentationSummaryDetails,
} from '../types/webhook';

const INDEX_SECTION_MARKER_PREFIX = 'DOCS-SYNC-INDEX';

type SummarySection = {
  heading: string;
  body: string;
};

export function buildDocumentationPageStorageValue(context: DocumentationSyncContext): string {
  const { payload, indexPageId, detailPageId, receivedAt } = context;
  const detail = payload.detail;
  const pageTitle = detailPageId ? buildPageUrl(detailPageId) : undefined;

  const sections = [
    '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>This page is managed by the Forge → Confluence docs sync flow.</p></ac:rich-text-body></ac:structured-macro>',
    '<h2>Navigation</h2>',
    `<ul><li><a href="${escapeStorageText(buildPageUrl(indexPageId))}">${escapeStorageText(CONFLUENCE_INDEX_TITLES[payload.pageType])}</a></li></ul>`,
    '<h2>Summary</h2>',
    buildSummaryMarkup(detail.summary ?? payload.summary, detail.summaryDetails),
    '<h2>Current State</h2>',
    `<p>${escapeStorageText(detail.currentState ?? payload.message)}</p>`,
  ];

  if (payload.pageType === 'integration-page') {
    sections.push('<h2>Connected System</h2>');
    sections.push(`<p>${escapeStorageText(detail.connectedSystem ?? payload.system ?? 'Not yet documented')}</p>`);
  }

  sections.push('<h2>Metadata</h2>');
  sections.push(
    buildDefinitionList([
      ['Page type', payload.pageType],
      ['Event type', payload.eventType],
      ['Status', detail.status],
      ['Owner', detail.owner],
      ['Owning Area', detail.owningArea],
      ['Seed Key', payload.seedKey],
      ['Source', payload.source],
      ['Timestamp', payload.timestamp],
      ['Processed by Forge', receivedAt],
      ['Page URL', pageTitle],
    ]),
  );

  sections.push('<h2>Key Notes</h2>');
  sections.push(buildList(detail.notes, 'No seed notes provided yet.'));

  if (payload.pageType === 'feature-page') {
    sections.push('<h2>Related Integrations</h2>');
    sections.push(buildList(detail.relatedIntegrations, 'Relationship names are stored now; link rendering can be expanded later.'));
  }

  if (payload.pageType === 'integration-page') {
    sections.push('<h2>Related Features</h2>');
    sections.push(buildList(detail.relatedFeatures, 'Relationship names are stored now; link rendering can be expanded later.'));
  }

  return sections.join('');
}

export function buildIndexLinkMarkup(pageType: SupportedPageType, linkTitle: string, linkPageId: string): string {
  return [
    '<li>',
    `<a href="${escapeStorageText(buildPageUrl(linkPageId))}" data-doc-sync-page-type="${escapeStorageText(pageType)}" data-doc-sync-page-id="${escapeStorageText(linkPageId)}">${escapeStorageText(linkTitle)}</a>`,
    '</li>',
  ].join('');
}

export function ensureIndexEntryInStorageValue(
  existingStorageValue: string,
  pageType: SupportedPageType,
  linkTitle: string,
  linkPageId: string,
): string {
  const marker = getIndexSectionMarker(pageType);
  const entryMarkup = buildIndexLinkMarkup(pageType, linkTitle, linkPageId);
  const sectionExpression = new RegExp(`<!-- ${marker}:START -->([\\s\\S]*?)<!-- ${marker}:END -->`);

  if (existingStorageValue.includes(`data-doc-sync-page-id="${linkPageId}"`)) {
    return existingStorageValue;
  }

  if (sectionExpression.test(existingStorageValue)) {
    return existingStorageValue.replace(sectionExpression, (fullMatch, sectionBody: string) => {
      const insertionPoint = sectionBody.includes('</ul>') ? sectionBody.lastIndexOf('</ul>') : -1;

      if (insertionPoint === -1) {
        return `<!-- ${marker}:START --><h2>Synced ${escapeStorageText(CONFLUENCE_INDEX_TITLES[pageType])} Entries</h2><ul>${entryMarkup}</ul><!-- ${marker}:END -->`;
      }

      const nextSectionBody = `${sectionBody.slice(0, insertionPoint)}${entryMarkup}${sectionBody.slice(insertionPoint)}`;
      return `<!-- ${marker}:START -->${nextSectionBody}<!-- ${marker}:END -->`;
    });
  }

  return [
    existingStorageValue,
    `<!-- ${marker}:START --><h2>Synced ${escapeStorageText(CONFLUENCE_INDEX_TITLES[pageType])} Entries</h2><ul>${entryMarkup}</ul><!-- ${marker}:END -->`,
  ].join('');
}

function buildSummaryMarkup(summary: string, summaryDetails?: ValidatedDocumentationSummaryDetails): string {
  const sections = getSummarySections(summaryDetails);

  if (sections.length === 0) {
    return `<p>${escapeStorageText(summary)}</p>`;
  }

  return [
    `<p>${escapeStorageText(summary)}</p>`,
    ...sections.map(({ heading, body }) => `<p><strong>${escapeStorageText(heading)}:</strong></p>${body}`),
  ].join('');
}

function getSummarySections(summaryDetails?: ValidatedDocumentationSummaryDetails): SummarySection[] {
  if (summaryDetails === undefined) {
    return [];
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
      summaryDetails.limitationsAndFutureImprovements,
    ),
  ].filter((section): section is SummarySection => section !== undefined);
}

function buildSummaryParagraphSection(heading: string, value?: string): SummarySection | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return {
    heading,
    body: `<p>${escapeStorageText(value)}</p>`,
  };
}

function buildSummaryListSection(heading: string, items?: string[]): SummarySection | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }

  const normalizedItems = items.map((item) => item.trim()).filter((item) => item.length > 0);

  if (normalizedItems.length === 0) {
    return undefined;
  }

  return {
    heading,
    body: buildList(normalizedItems, 'None documented.'),
  };
}

function buildDefinitionList(entries: Array<[string, string | undefined]>): string {
  const filteredEntries = entries.filter(([, value]) => typeof value === 'string' && value.trim().length > 0);

  if (filteredEntries.length === 0) {
    return '<p>No metadata provided.</p>';
  }

  return `<table><tbody>${filteredEntries
    .map(
      ([label, value]) =>
        `<tr><th><p>${escapeStorageText(label)}</p></th><td><p>${escapeStorageText(value ?? '')}</p></td></tr>`,
    )
    .join('')}</tbody></table>`;
}

function buildList(items: string[], emptyMessage: string): string {
  if (items.length === 0) {
    return `<p>${escapeStorageText(emptyMessage)}</p>`;
  }

  return `<ul>${items.map((item) => `<li>${escapeStorageText(item)}</li>`).join('')}</ul>`;
}

function buildPageUrl(pageId: string): string {
  return `${CONFLUENCE_SITE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${pageId}`;
}

function getIndexSectionMarker(pageType: SupportedPageType): string {
  return `${INDEX_SECTION_MARKER_PREFIX}:${pageType.toUpperCase()}`;
}

function escapeStorageText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
