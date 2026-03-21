import {
  SUPPORTED_EVENT_TYPES,
  SUPPORTED_PAGE_TYPES,
  SUPPORTED_SOURCES,
} from '../config/constants';
import { ValidationError } from '../errors/appError';
import type {
  DocumentationWebhookPayload,
  DocumentationWebhookPayloadData,
  DocumentationWebhookPayloadDetail,
  ValidatedDocumentationDetail,
  ValidatedDocumentationWebhookPayload,
} from '../types/webhook';

export function validateDocumentationWebhookPayload(
  payload: DocumentationWebhookPayload,
): ValidatedDocumentationWebhookPayload {
  assertAllowedValue('source', payload.source, SUPPORTED_SOURCES);
  assertAllowedValue('eventType', payload.eventType, SUPPORTED_EVENT_TYPES);
  assertRequiredString('summary', payload.summary);
  assertRequiredString('message', payload.message);
  assertIsoTimestamp(payload.timestamp);

  const payloadData = getPlainObject(payload.data);
  const pageType = getValidatedPageType(payload.pageType, payloadData);
  const title = getValidatedTitle(payload, pageType);
  const detail = getValidatedDetail(payload.summary, payload.message, payload.system, payloadData?.detail);
  const seedKey = getOptionalString(payloadData?.seedKey);

  return {
    source: payload.source,
    eventType: payload.eventType,
    pageType,
    title,
    summary: payload.summary.trim(),
    message: payload.message.trim(),
    timestamp: payload.timestamp,
    ...getOptionalValidatedField('feature', payload.feature),
    ...getOptionalValidatedField('system', payload.system),
    ...getOptionalValidatedField('integration', payload.integration),
    ...getOptionalValidatedField('release', payload.release),
    ...getOptionalValidatedField('incidentId', payload.incidentId),
    ...(seedKey === undefined ? {} : { seedKey }),
    detail,
  };
}

function getValidatedPageType(
  pageTypeValue: unknown,
  data: DocumentationWebhookPayloadData | undefined,
): ValidatedDocumentationWebhookPayload['pageType'] {
  const rawPageType = typeof pageTypeValue === 'string' ? pageTypeValue : data?.pageType;

  if (typeof rawPageType !== 'string' || !isSupportedPageType(rawPageType)) {
    throw new ValidationError('Field "pageType" must be a supported routed page type.', {
      allowedValues: SUPPORTED_PAGE_TYPES,
      received: rawPageType,
    });
  }

  return rawPageType;
}

function getValidatedTitle(
  payload: DocumentationWebhookPayload,
  pageType: ValidatedDocumentationWebhookPayload['pageType'],
): string {
  const candidate =
    pageType === 'feature-page'
      ? payload.feature
      : pageType === 'integration-page'
        ? payload.integration
        : pageType === 'release-page'
          ? payload.release
          : payload.incidentId;

  assertRequiredString(pageType, candidate);

  return candidate.trim();
}

function getValidatedDetail(
  summary: string,
  message: string,
  system: string | undefined,
  detail: DocumentationWebhookPayloadDetail | undefined,
): ValidatedDocumentationDetail {
  return {
    summary: getOptionalString(detail?.summary) ?? summary.trim(),
    status: getOptionalString(detail?.status),
    owner: getOptionalString(detail?.owner),
    owningArea: getOptionalString(detail?.owningArea),
    currentState: getOptionalString(detail?.currentState) ?? message.trim(),
    connectedSystem: getOptionalString(detail?.connectedSystem) ?? getOptionalString(system),
    notes: getOptionalStringArray(detail?.notes),
    relatedFeatures: getOptionalStringArray(detail?.relatedFeatures),
    relatedIntegrations: getOptionalStringArray(detail?.relatedIntegrations),
  };
}

function getOptionalValidatedField<
  T extends 'feature' | 'system' | 'integration' | 'release' | 'incidentId',
>(fieldName: T, value: unknown): Partial<Record<T, string>> {
  const normalizedValue = getOptionalString(value);

  return normalizedValue === undefined
    ? {}
    : ({ [fieldName]: normalizedValue } as Partial<Record<T, string>>);
}

function assertRequiredString(fieldName: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`Field "${fieldName}" must be a non-empty string.`, {
      fieldName,
    });
  }
}

function assertAllowedValue<T extends readonly string[]>(
  fieldName: string,
  value: unknown,
  allowedValues: T,
): asserts value is T[number] {
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    throw new ValidationError(`Field "${fieldName}" contains an unsupported value.`, {
      fieldName,
      allowedValues,
      received: value,
    });
  }
}

function assertIsoTimestamp(value: unknown): asserts value is string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new ValidationError('Field "timestamp" must be a valid ISO-8601 timestamp.', {
      fieldName: 'timestamp',
      received: value,
    });
  }
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? undefined : trimmedValue;
}

function getOptionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getPlainObject(value: unknown): DocumentationWebhookPayloadData | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as DocumentationWebhookPayloadData;
}

function isSupportedPageType(value: string): value is ValidatedDocumentationWebhookPayload['pageType'] {
  return (SUPPORTED_PAGE_TYPES as readonly string[]).includes(value);
}
