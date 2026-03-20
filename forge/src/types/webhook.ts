import type { SUPPORTED_EVENT_TYPES, SUPPORTED_SOURCES } from '../config/constants';

export type SupportedWebhookSource = (typeof SUPPORTED_SOURCES)[number];
export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

export interface DocumentationWebhookPayload {
  source: string;
  eventType: string;
  feature: string;
  summary: string;
  message: string;
  timestamp: string;
}

export interface ValidatedDocumentationWebhookPayload {
  source: SupportedWebhookSource;
  eventType: SupportedEventType;
  feature: string;
  summary: string;
  message: string;
  timestamp: string;
}

export interface DocumentationEntryContext {
  payload: ValidatedDocumentationWebhookPayload;
  receivedAt: string;
}
