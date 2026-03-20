import { SUPPORTED_EVENT_TYPES, SUPPORTED_SOURCES } from '../config/constants';
import { ValidationError } from '../errors/appError';
import type {
  DocumentationWebhookPayload,
  ValidatedDocumentationWebhookPayload,
} from '../types/webhook';

export function validateDocumentationWebhookPayload(
  payload: DocumentationWebhookPayload,
): ValidatedDocumentationWebhookPayload {
  assertAllowedValue('source', payload.source, SUPPORTED_SOURCES);
  assertAllowedValue('eventType', payload.eventType, SUPPORTED_EVENT_TYPES);
  assertRequiredString('feature', payload.feature);
  assertRequiredString('summary', payload.summary);
  assertRequiredString('message', payload.message);
  assertIsoTimestamp(payload.timestamp);

  return {
    source: payload.source,
    eventType: payload.eventType,
    feature: payload.feature.trim(),
    summary: payload.summary.trim(),
    message: payload.message.trim(),
    timestamp: payload.timestamp,
  };
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
