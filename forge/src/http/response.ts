import { AppError, InternalServerError } from '../errors/appError';

export interface ForgeWebTriggerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface ResponsePayload {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    details?: Record<string, unknown>;
  };
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

export function okResponse(message: string, data?: Record<string, unknown>): ForgeWebTriggerResponse {
  return jsonResponse(200, {
    success: true,
    message,
    data,
  });
}

export function errorResponse(error: unknown): ForgeWebTriggerResponse {
  const normalizedError = normalizeError(error);

  return jsonResponse(normalizedError.statusCode, {
    success: false,
    message: normalizedError.message,
    error: {
      code: normalizedError.code,
      details: normalizedError.details,
    },
  });
}

function jsonResponse(statusCode: number, payload: ResponsePayload): ForgeWebTriggerResponse {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  };
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new InternalServerError('Unexpected server error.', {
    cause: error,
  });
}
