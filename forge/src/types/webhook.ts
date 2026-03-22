import type {
  SUPPORTED_EVENT_TYPES,
  SUPPORTED_PAGE_TYPES,
  SUPPORTED_SOURCES,
} from '../config/constants';

export type SupportedWebhookSource = (typeof SUPPORTED_SOURCES)[number];
export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];
export type SupportedPageType = (typeof SUPPORTED_PAGE_TYPES)[number];

export interface DocumentationSummaryDetails {
  what?: unknown;
  whyItExists?: unknown;
  whoUsesIt?: unknown;
  flow?: unknown;
  dependencies?: unknown;
  inputsAndOutputs?: unknown;
  expectedBehavior?: unknown;
  failurePointsAndRisks?: unknown;
  operationalConsiderations?: unknown;
  limitationsAndFutureImprovements?: unknown;
}

export interface DocumentationWebhookPayloadDetail {
  summary?: unknown;
  summaryDetails?: DocumentationSummaryDetails;
  status?: unknown;
  owner?: unknown;
  owningArea?: unknown;
  currentState?: unknown;
  connectedSystem?: unknown;
  notes?: unknown;
  relatedFeatures?: unknown;
  relatedIntegrations?: unknown;
}

export interface DocumentationWebhookPayloadData {
  pageType?: unknown;
  seedKey?: unknown;
  detail?: DocumentationWebhookPayloadDetail;
  [key: string]: unknown;
}

export interface DocumentationWebhookPayload {
  source: string;
  eventType: string;
  feature?: string;
  system?: string;
  integration?: string;
  release?: string;
  incidentId?: string;
  pageType?: string;
  content?: string;
  summary: string;
  message: string;
  timestamp: string;
  data?: DocumentationWebhookPayloadData;
}

export interface ValidatedDocumentationSummaryDetails {
  what?: string;
  whyItExists?: string;
  whoUsesIt: string[];
  flow: string[];
  dependencies: string[];
  inputsAndOutputs: string[];
  expectedBehavior: string[];
  failurePointsAndRisks: string[];
  operationalConsiderations: string[];
  limitationsAndFutureImprovements: string[];
}

export interface ValidatedDocumentationDetail {
  summary?: string;
  summaryDetails?: ValidatedDocumentationSummaryDetails;
  status?: string;
  owner?: string;
  owningArea?: string;
  currentState?: string;
  connectedSystem?: string;
  notes: string[];
  relatedFeatures: string[];
  relatedIntegrations: string[];
}

export interface ValidatedDocumentationWebhookPayload {
  source: SupportedWebhookSource;
  eventType: SupportedEventType;
  pageType: SupportedPageType;
  title: string;
  feature?: string;
  system?: string;
  integration?: string;
  release?: string;
  incidentId?: string;
  content?: string;
  summary: string;
  message: string;
  timestamp: string;
  seedKey?: string;
  detail: ValidatedDocumentationDetail;
}

export interface DocumentationSyncContext {
  payload: ValidatedDocumentationWebhookPayload;
  receivedAt: string;
  indexPageId: string;
  detailPageId?: string;
}
