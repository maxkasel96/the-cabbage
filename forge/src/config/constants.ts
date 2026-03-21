export const CONFLUENCE_SITE_BASE_URL =
  'https://maxckasel-1768672708733.atlassian.net/wiki';
export const CONFLUENCE_SPACE_KEY = 'TC';
export const DEFAULT_TARGET_PAGE_ID = '21692417';

export const CONFLUENCE_INDEX_TITLES = {
  'feature-page': 'Features Index',
  'integration-page': 'Integrations Index',
  'release-page': 'Releases Index',
  'incident-page': 'Incidents Index',
} as const;

export const SUPPORTED_EVENT_TYPES = [
  'docs-sync-test',
  'feature-create',
  'feature-update',
  'feature-delete',
  'integration-create',
  'integration-update',
  'integration-delete',
  'release-update',
  'incident-update',
] as const;

export const SUPPORTED_PAGE_TYPES = [
  'feature-page',
  'integration-page',
  'release-page',
  'incident-page',
] as const;

export const SUPPORTED_SOURCES = ['nextjs-app'] as const;

export const FUTURE_SECRET_HEADER_NAME = 'x-doc-sync-secret';
export const FUTURE_IDEMPOTENCY_HEADER_NAME = 'x-doc-sync-idempotency-key';

export const WEBHOOK_SHARED_SECRET = process.env.WEBHOOK_SHARED_SECRET;

export const CONFLUENCE_PAGE_BODY_FORMAT = 'storage';
export const CONFLUENCE_API_V2_BASE_PATH = '/wiki/api/v2';
