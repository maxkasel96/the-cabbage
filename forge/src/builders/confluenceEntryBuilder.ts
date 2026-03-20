import type { DocumentationEntryContext } from '../types/webhook';

export function buildDocumentationEntryStorageValue(context: DocumentationEntryContext): string {
  const { payload, receivedAt } = context;

  const rows = [
    ['Event type', payload.eventType],
    ['Feature', payload.feature],
    ['Source', payload.source],
    ['Timestamp', payload.timestamp],
    ['Processed by Forge', receivedAt],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th><p>${escapeStorageText(label)}</p></th><td><p>${escapeStorageText(value)}</p></td></tr>`,
    )
    .join('');

  return [
    '<hr />',
    `<h2>${escapeStorageText(titleCase(payload.eventType))}: ${escapeStorageText(payload.feature)}</h2>`,
    `<p><strong>Summary:</strong> ${escapeStorageText(payload.summary)}</p>`,
    `<p>${escapeStorageText(payload.message)}</p>`,
    `<table><tbody>${tableRows}</tbody></table>`,
    '<!-- TODO: Support alternate templates per event type and richer Confluence macros. -->',
  ].join('');
}

function escapeStorageText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
