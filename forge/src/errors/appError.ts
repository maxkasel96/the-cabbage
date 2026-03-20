export interface AppErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(message: string, statusCode: number, code: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', { details });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized request.') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ConfluenceApiError extends AppError {
  constructor(message: string, statusCode = 502, options: AppErrorOptions = {}) {
    super(message, statusCode, 'CONFLUENCE_API_ERROR', options);
    this.name = 'ConfluenceApiError';
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Unexpected server error.', options: AppErrorOptions = {}) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', options);
    this.name = 'InternalServerError';
  }
}
