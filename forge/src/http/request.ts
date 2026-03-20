import type { DocumentationWebhookPayload } from '../types/webhook';
import { ValidationError } from '../errors/appError';

export interface ForgeWebTriggerRequest {
  body?: string;
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  path?: string;
  queryParameters?: Record<string, string[] | undefined>;
}

export function assertHttpMethod(request: ForgeWebTriggerRequest, expectedMethod: string): void {
  const requestMethod = request.method?.toUpperCase() ?? 'GET';

  if (requestMethod !== expectedMethod.toUpperCase()) {
    throw new ValidationError(`Unsupported HTTP method: ${requestMethod}.`, {
      expectedMethod,
      receivedMethod: requestMethod,
    });
  }
}

export function parseWebhookRequestBody(request: ForgeWebTriggerRequest): DocumentationWebhookPayload {
  if (!request.body) {
    throw new ValidationError('Request body is required.');
  }

  try {
    return JSON.parse(request.body) as DocumentationWebhookPayload;
  } catch (error) {
    throw new ValidationError('Request body must be valid JSON.', {
      cause: error instanceof Error ? error.message : 'unknown-parse-error',
    });
  }
}

export function getHeader(
  request: ForgeWebTriggerRequest,
  headerName: string,
): string | undefined {
  const headerValue = request.headers?.[headerName.toLowerCase()] ?? request.headers?.[headerName];

  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
}
