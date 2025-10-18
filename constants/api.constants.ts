/**
 * API-related constants
 *
 * Centralized file for HTTP status codes, error messages, response structures,
 * and other API infrastructure constants shared across routes and services.
 */

/**
 * HTTP status codes
 */
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * API response structure keys
 */
export const API_RESPONSE_KEYS = {
  DATA: "data",
  ERROR: "error",
  MESSAGE: "message",
  DETAILS: "details",
  STATUS: "status",
  SUCCESS: "success",
} as const;

/**
 * Content types
 */
export const CONTENT_TYPES = {
  JSON: "application/json",
  FORM_DATA: "multipart/form-data",
  TEXT_PLAIN: "text/plain",
  TEXT_HTML: "text/html",
} as const;

/**
 * Validation error types
 */
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Invalid email format",
  INVALID_URL: "Invalid URL format",
  MIN_LENGTH: "Minimum length not met",
  MAX_LENGTH: "Maximum length exceeded",
  INVALID_NUMBER: "Invalid number format",
  INVALID_DATE: "Invalid date format",
  INVALID_ENUM_VALUE: "Invalid enum value",
} as const;

/**
 * API error response messages
 */
export const API_ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Not found",
  INTERNAL_ERROR: "Internal error",
} as const;
