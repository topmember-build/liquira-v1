/**
 * Error handling utilities
 * Defines custom error classes and error response formatting
 */

/**
 * Base API Error
 */
export class APIError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "APIError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Quote-related errors
 */
export class QuoteError extends APIError {
  constructor(message: string, statusCode = 400, details?: any) {
    super("QUOTE_ERROR", statusCode, message, details);
    this.name = "QuoteError";
  }
}

/**
 * Route-related errors
 */
export class RouteError extends APIError {
  constructor(message: string, statusCode = 400, details?: any) {
    super("ROUTE_ERROR", statusCode, message, details);
    this.name = "RouteError";
  }
}

/**
 * Execution-related errors
 */
export class ExecutionError extends APIError {
  constructor(message: string, statusCode = 400, details?: any) {
    super("EXECUTION_ERROR", statusCode, message, details);
    this.name = "ExecutionError";
  }
}

/**
 * Provider-related errors
 */
export class ProviderError extends APIError {
  constructor(
    public providerName: string,
    message: string,
    statusCode = 502,
    details?: any
  ) {
    super(`PROVIDER_ERROR_${providerName.toUpperCase()}`, statusCode, message, details);
    this.name = "ProviderError";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super("VALIDATION_ERROR", 400, message, details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends APIError {
  constructor(message: string = "Authentication required") {
    super("AUTH_ERROR", 401, message);
    this.name = "AuthenticationError";
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends APIError {
  constructor(retryAfter: number = 60) {
    super("RATE_LIMIT_ERROR", 429, "Too many requests", { retryAfter });
    this.name = "RateLimitError";
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends APIError {
  constructor(resource: string) {
    super("NOT_FOUND", 404, `${resource} not found`);
    this.name = "NotFoundError";
  }
}

/**
 * Internal server errors
 */
export class InternalError extends APIError {
  constructor(message: string = "Internal server error", details?: any) {
    super("INTERNAL_ERROR", 500, message, details);
    this.name = "InternalError";
  }
}

/**
 * Format error response
 */
export function formatErrorResponse(error: any) {
  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    };
  }

  // Unknown error - wrap it
  return {
    statusCode: 500,
    body: {
      error: {
        code: "UNKNOWN_ERROR",
        message: error?.message || "An unexpected error occurred",
      },
    },
  };
}

export default {
  APIError,
  QuoteError,
  RouteError,
  ExecutionError,
  ProviderError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  InternalError,
  formatErrorResponse,
};
