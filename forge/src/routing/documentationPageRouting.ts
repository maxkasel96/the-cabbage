import type { ValidatedDocumentationWebhookPayload } from '../types/webhook';

export interface DocumentationPageRoutingResult {
  normalizedFeature: string;
  pageTitle: string;
  pageType: 'feature-page';
}

export function routeDocumentationPage(
  payload: ValidatedDocumentationWebhookPayload,
): DocumentationPageRoutingResult {
  const normalizedFeature = normalizeFeature(payload.feature);

  return {
    normalizedFeature,
    pageTitle: `Feature - ${normalizedFeature}`,
    pageType: 'feature-page',
  };
}

function normalizeFeature(feature: string): string {
  return feature.trim().toLowerCase().replace(/[\s_]+/g, '-');
}
